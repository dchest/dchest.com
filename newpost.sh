#!/bin/sh

if [ -z $1 ]; then
    echo "usage: ./newpost.sh postname"
    exit 1
fi

LAYOUT="post"

YEAR=$(date +'%Y')
DATE=$(date +'%Y-%m-%d')
BASEDIR=$(dirname "$0")
FILENAME="$BASEDIR/posts/$YEAR/$DATE-$1.md"

if [ -f $FILENAME ]; then
    echo "File $FILENAME already exists"
    exit 2
fi

mkdir -p $(dirname $FILENAME) || 0
echo "---\nlayout: $LAYOUT\n---\n" > $FILENAME
