#!/usr/bin/env bash


if ! [ -z "${LOCAL_SUMAN_ALREADY_FOUND+x}" ]; then
    echo " => \$LOCAL_SUMAN_ALREADY_FOUND ? => $LOCAL_SUMAN_ALREADY_FOUND"
fi

echo " => Original path of Suman executable => \"$0\""
DIRN=$(dirname "$0")
RL=$(readlink "$0");
EXECDIR=$(dirname $(dirname "$RL"));
MYPATH="$DIRN/$EXECDIR";
X="$(cd $(dirname ${MYPATH}) && pwd)/$(basename ${MYPATH})"

echo "RL => ${RL}"
echo "X => ${X}"

NODE_PATH=${NODE_PATH}:~/.suman/global/node_modules
# remove duplicate entries according to http://linuxg.net/oneliners-for-removing-the-duplicates-in-your-path/
NODE_PATH=`echo -n ${NODE_PATH} | awk -v RS=: '{ if (!arr[$0]++) {printf("%s%s",!ln++?"":":",$0)}}'`

echo "node path => $NODE_PATH"

PATH=$(printf %s "$PATH" \
     | awk -vRS=: -vORS= '!a[$0]++ {if (NR>1) printf(":"); printf("%s", $0) }' )

if [ "${LOCAL_SUMAN_ALREADY_FOUND}" == "yes" ]; then
    # we know that this directory contains the local version of suman we want to use
    NODE_PATH=${NODE_PATH} SUMAN_EXTRANEOUS_EXECUTABLE=yes node ${X}/cli.js $@
else

    echo "X2 => ${X}"
    # we are probably in the global install space, so let's find the local installation given pwd/cwd
    LOCAL_SUMAN=$(node ${X}/scripts/find-local-suman-executable.js)

    echo "local suman => $LOCAL_SUMAN"

    if [ -z "$LOCAL_SUMAN" ]; then
        # no local version found, so we fallback on the version in this directory, global or not
        echo " => No local Suman executable could be found, given the current directory => $PWD"
        echo " => Attempting to run installed version of Suman here => ${X}/cli.js"
          echo "X3 => ${X}"
        NODE_PATH=${NODE_PATH} SUMAN_EXTRANEOUS_EXECUTABLE=yes node ${X}/cli.js $@

    else
        # local version found, so we run it
        NODE_PATH=${NODE_PATH} SUMAN_EXTRANEOUS_EXECUTABLE=yes node ${LOCAL_SUMAN} $@
    fi

fi
