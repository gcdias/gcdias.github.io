#!/bin/bash

for d in ./*/; do
 pushd $d > /dev/null
 make && make zip
 mv *.zip ../
 popd > /dev/null
done