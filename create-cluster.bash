#!/bin/bash

set -eux

# get environment variables
source /host/env

if [[ $EUID -ne 0 ]]; then
    echo "run as root"
    exit 1
fi

bash "${HOSTDIR}/img-common-create.bash" 
bash "${HOSTDIR}/img-mount.bash" common
bash "${HOSTDIR}/common-provision.bash"

echo master > /mnt/common/hostname
cp ${IMGDIR}/common.img ${IMGDIR}/master.img

START=1
for (( c=$START; c<=$NUMSLAVES; c++ )) do
    echo slave-$c > /mnt/common/hostname
    cp ${IMGDIR}/common.img ${IMGDIR}/slave-${c}.img
done

bash "${HOSTDIR}/img-umount.bash" common