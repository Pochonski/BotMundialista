#!/bin/bash
# Copiar todos los módulos de /tmp/ a /node_modules/
for dir in /tmp/*/; do
  name=$(basename "$dir")
  if [ -d "$dir" ] && [ "$name" != "..tmp" ]; then
    if [ ! -d "/node_modules/$name" ]; then
      cp -r "$dir" /node_modules/ 2>/dev/null
    fi
  fi
done
ls /node_modules/ | wc -l