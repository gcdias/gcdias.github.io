if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/audio-rec/serviceWorker.js').catch(error => {
            console.error('Service worker registration failed:', error);
        });
    });
}

let mediaRecorder;
let audioChunks = [];
let audioContext;
let analyserL, analyserR;
let streamRef;
let timerInterval;
let recordingStartedAt;
let playbackUrl;
let isStarting = false;
let isFinalizing = false;
let selectedBitrate = 256000;
let selectedDuration = 300;
let selectedFormat = null;
let selectedMimeType = null;
let stopReason = 'manual';

const recordButton = document.getElementById('recordToggle');
const statusDiv = document.getElementById('status');
const timerDiv = document.getElementById('timer');
const audioPlayback = document.getElementById('audioPlayback');
const meterL = document.getElementById('meter-l');
const meterR = document.getElementById('meter-r');
const microphoneOff = document.getElementById('microphoneOff');
const microphoneOn = document.getElementById('microphoneOn');
const recordingOptions = document.getElementById('recordingOptions');
const formatSupport = document.getElementById('formatSupport');

const formatDefinitions = [
    { name: 'webm', mimeTypes: ['audio/webm;codecs=opus', 'audio/webm'] },
    { name: 'mp4', mimeTypes: ['audio/mp4;codecs=mp4a.40.2', 'audio/mp4'] }
];

const supportedFormats = typeof MediaRecorder === 'undefined'
    ? []
    : formatDefinitions.map(format => ({
        name: format.name,
        mimeType: format.mimeTypes.find(type => MediaRecorder.isTypeSupported(type))
    })).filter(format => format.mimeType);

function setMicrophoneState(active) {
    microphoneOff.classList.toggle('is-active', !active);
    microphoneOn.classList.toggle('is-active', active);
    recordButton.classList.toggle('is-recording', active);
    recordButton.setAttribute('aria-pressed', String(active));
    recordButton.setAttribute('aria-label', active ? 'Parar gravação' : 'Gravar');
    recordButton.title = active ? 'Parar gravação' : 'Gravar';
    recordingOptions.disabled = active || isFinalizing;
}

function setSelectedOption(buttons, selectedButton) {
    buttons.forEach(button => {
        button.setAttribute('aria-pressed', String(button === selectedButton));
    });
}

const bitrateButtons = Array.from(document.querySelectorAll('[data-bitrate]'));
bitrateButtons.forEach(button => {
    button.addEventListener('click', () => {
        selectedBitrate = Number(button.dataset.bitrate);
        setSelectedOption(bitrateButtons, button);
    });
});

const formatButtons = Array.from(document.querySelectorAll('[data-format]'));
supportedFormats.forEach(format => {
    const button = formatButtons.find(item => item.dataset.format === format.name);
    if (button) button.disabled = false;
});
formatButtons.forEach(button => {
    const format = supportedFormats.find(item => item.name === button.dataset.format);
    button.disabled = !format;
    if (!format) button.title = 'Este formato não é suportado neste navegador';
    button.addEventListener('click', () => {
        if (!format) return;
        selectedFormat = format.name;
        selectedMimeType = format.mimeType;
        setSelectedOption(formatButtons, button);
    });
});

const initialFormat = supportedFormats.find(format => format.name === 'webm') || supportedFormats[0];
if (initialFormat) {
    selectedFormat = initialFormat.name;
    selectedMimeType = initialFormat.mimeType;
    const selectedFormatButton = formatButtons.find(button => button.dataset.format === initialFormat.name);
    setSelectedOption(formatButtons, selectedFormatButton);
} else {
    formatSupport.textContent = 'Este navegador não suporta gravação em WebM ou MP4.';
    formatSupport.hidden = false;
}

const durationButtons = Array.from(document.querySelectorAll('[data-duration]'));
durationButtons.forEach(button => {
    button.addEventListener('click', () => {
        selectedDuration = Number(button.dataset.duration);
        setSelectedOption(durationButtons, button);
    });
});

function updateTimer() {
    const elapsedSeconds = Math.floor((Date.now() - recordingStartedAt) / 1000);
    const hours = String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0');
    const minutes = String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0');
    const seconds = String(elapsedSeconds % 60).padStart(2, '0');
    timerDiv.textContent = `${hours}:${minutes}:${seconds}`;

    if (selectedDuration > 0 && elapsedSeconds >= selectedDuration) {
        stopRecording('timer');
    }
}

async function startRecording() {
    if (isStarting || isFinalizing || mediaRecorder?.state === 'recording') return;
    if (!navigator.mediaDevices?.getUserMedia) {
        statusDiv.textContent = 'Este navegador não permite acesso ao microfone.';
        return;
    }
    if (typeof MediaRecorder === 'undefined' || !selectedFormat || !selectedMimeType) {
        statusDiv.textContent = 'Não há um formato de gravação compatível neste navegador.';
        return;
    }

    isStarting = true;
    recordButton.disabled = true;
    statusDiv.textContent = 'A aguardar autorização do microfone...';
    audioChunks = [];
    stopReason = 'manual';

    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                channelCount: 2,
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });
        streamRef = stream;

        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = audioContext.createMediaStreamSource(stream);
        const splitter = audioContext.createChannelSplitter(2);
        analyserL = audioContext.createAnalyser();
        analyserR = audioContext.createAnalyser();
        source.connect(splitter);
        splitter.connect(analyserL, 0);
        splitter.connect(analyserR, 1);

        const recordingMimeType = selectedMimeType;
        const recorder = new MediaRecorder(stream, {
            mimeType: recordingMimeType,
            audioBitsPerSecond: selectedBitrate
        });
        recorder.ondataavailable = event => {
            if (event.data.size > 0) audioChunks.push(event.data);
        };
        recorder.onstop = () => {
            const mimeType = recorder.mimeType || audioChunks.find(chunk => chunk.type)?.type || recordingMimeType;
            const audioBlob = new Blob(audioChunks, { type: mimeType });
            if (audioBlob.size > 0) {
                if (playbackUrl) URL.revokeObjectURL(playbackUrl);
                playbackUrl = URL.createObjectURL(audioBlob);
                audioPlayback.src = playbackUrl;
                statusDiv.textContent = stopReason === 'timer'
                    ? 'Tempo limite atingido. Gravação concluída.'
                    : 'Gravação concluída! Ouve o resultado.';
            } else {
                statusDiv.textContent = stopReason === 'timer'
                    ? 'Tempo limite atingido; sem dados de áudio.'
                    : 'Gravação concluída sem dados de áudio.';
            }
            isFinalizing = false;
            recordingOptions.disabled = false;
            recordButton.disabled = false;
        };

        recorder.start();
        mediaRecorder = recorder;
        recordingStartedAt = Date.now();
        statusDiv.textContent = 'A gravar em estéreo...';
        setMicrophoneState(true);
        recordButton.disabled = false;
        updateTimer();
        timerInterval = setInterval(updateTimer, 1000);
        updateMeters();
    } catch (error) {
        streamRef?.getTracks().forEach(track => track.stop());
        streamRef = null;
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close().catch(closeError => console.error('Erro ao fechar o áudio:', closeError));
            audioContext = null;
        }
        setMicrophoneState(false);
        recordButton.disabled = false;
        statusDiv.textContent = `Não foi possível iniciar a gravação: ${error.message}`;
        console.error('Erro ao iniciar a gravação:', error);
    } finally {
        isStarting = false;
    }
}

function stopRecording(reason = 'manual') {
    if (!mediaRecorder || mediaRecorder.state !== 'recording') return;

    stopReason = reason;
    isFinalizing = true;
    recordButton.disabled = true;
    statusDiv.textContent = reason === 'timer' ? 'A finalizar gravação pelo temporizador...' : 'A finalizar gravação...';
    mediaRecorder.stop();
    streamRef?.getTracks().forEach(track => track.stop());
    streamRef = null;
    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close().catch(error => console.error('Erro ao fechar o áudio:', error));
        audioContext = null;
    }
    clearInterval(timerInterval);
    setMicrophoneState(false);
    meterL.style.width = '0%';
    meterR.style.width = '0%';
}

recordButton.addEventListener('click', () => {
    if (mediaRecorder?.state === 'recording') {
        stopRecording();
    } else {
        startRecording();
    }
});

function updateMeters() {
    if (mediaRecorder?.state === 'recording' && audioContext && analyserL && analyserR) {
        const dataL = new Uint8Array(analyserL.frequencyBinCount);
        const dataR = new Uint8Array(analyserR.frequencyBinCount);
        analyserL.getByteFrequencyData(dataL);
        analyserR.getByteFrequencyData(dataR);

        const avgL = dataL.reduce((total, value) => total + value, 0) / dataL.length;
        const avgR = dataR.reduce((total, value) => total + value, 0) / dataR.length;
        meterL.style.width = Math.min((avgL / 128) * 100, 100) + '%';
        meterR.style.width = Math.min((avgR / 128) * 100, 100) + '%';
        requestAnimationFrame(updateMeters);
    }
}
