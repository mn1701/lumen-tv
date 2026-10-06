#!/usr/bin/env python3
"""Stage a packaged webOS application from an existing frontend build."""
import argparse
import json
from pathlib import Path
import shutil
import struct
import subprocess
import zlib

ROOT=Path(__file__).resolve().parents[1]

def icon(size):
    rows=[]
    for y in range(size):
        row=bytearray()
        for x in range(size):
            lit=size*.29<x<size*.69 and size*.22<y<size*.78 and x<size*.29+(y-size*.22)*.75
            row.extend((201,227,174,255) if lit else (18,23,22,255))
        rows.append(b'\0'+row)
    def chunk(kind,data): return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows)))+chunk(b'IEND',b'')

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--package',action='store_true');args=parser.parse_args()
    source=ROOT/'client/dist';stage=ROOT/'build/webos';platform=ROOT/'platform/webos'
    if not (source/'index.html').is_file(): raise SystemExit('Build client/ with npm run build first.')
    stage.mkdir(parents=True,exist_ok=True)
    # This script owns only its generated staging directory.
    shutil.rmtree(stage);shutil.copytree(source,stage)
    metadata=json.loads((platform/'appinfo.json').read_text())
    if metadata['main']!='index.html' or metadata['type']!='web': raise SystemExit('Unsupported packaging metadata.')
    shutil.copy2(platform/'appinfo.json',stage/'appinfo.json')
    (stage/'icon.png').write_bytes(icon(80));(stage/'large-icon.png').write_bytes(icon(130))
    sdk=platform/'vendor/webOSTV.js'
    if sdk.is_file():
        shutil.copy2(sdk,stage/'webOSTV.js')
        index=stage/'index.html';index.write_text(index.read_text().replace('<head>','<head><script src="./webOSTV.js"></script>',1))
    print('Staged',stage)
    if args.package:
        subprocess.run(['ares-package',str(stage),'-o',str(ROOT/'build')],check=True)

if __name__=='__main__': main()
