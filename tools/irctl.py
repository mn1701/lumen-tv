#!/usr/bin/env python3
"""Send framed commands to the optional UART1 infrared bridge."""
import argparse
import binascii
import secrets
import struct
import time

def encode(opcode,sequence,address,command):
    data=struct.pack('<2sBBH HBB',b'\xa5\x5a',1,opcode,sequence,address,command,0)
    return data+struct.pack('>H',binascii.crc_hqx(data,0xffff))

def receive(port,opcode,sequence,deadline):
    buffer=bytearray()
    while time.monotonic()<deadline:
        buffer.extend(port.read(1))
        while len(buffer)>=2 and buffer[:2]!=b'\xa5\x5a': del buffer[0]
        if len(buffer)<12: continue
        frame=bytes(buffer[:12]);del buffer[:12]
        if binascii.crc_hqx(frame[:10],0xffff)!=int.from_bytes(frame[10:],'big'): continue
        if frame[2]!=1 or frame[3]!=opcode|0x80 or int.from_bytes(frame[4:6],'little')!=sequence: continue
        return frame[6]
    raise TimeoutError('No acknowledged result. Delivery may have happened; retries must use the same frame.')

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('port');parser.add_argument('--address',type=lambda x:int(x,0),default=0);parser.add_argument('--command',type=lambda x:int(x,0),default=0);parser.add_argument('--ping',action='store_true');args=parser.parse_args()
    if not 0<=args.address<=65535 or not 0<=args.command<=255: parser.error('Address must fit 16 bits and command must fit 8 bits.')
    try: import serial
    except ImportError: parser.error('Install tools/requirements.txt into a virtual environment first.')
    opcode=2 if args.ping else 1;sequence=secrets.randbelow(65536);frame=encode(opcode,sequence,args.address,args.command)
    with serial.Serial(args.port,115200,timeout=0.1,write_timeout=1) as port:
        # Only the same frame is retried. The board deduplicates its eight most recent sequences.
        for attempt in range(2):
            port.write(frame);port.flush()
            try:
                status=receive(port,opcode,sequence,time.monotonic()+2)
                if status: raise SystemExit(f'Bridge returned status {status}. Command was not automatically repeated.')
                print('Acknowledged',sequence);return
            except TimeoutError:
                if attempt: raise

if __name__=='__main__': main()
