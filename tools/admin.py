#!/usr/bin/env python3
"""Operate the companion's opt-in administration API without putting credentials in argv."""
import argparse
import json
import os
from urllib.error import HTTPError
from urllib.parse import quote,urlsplit
from urllib.request import Request,urlopen

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--origin',default='http://127.0.0.1:8090')
    parser.add_argument('action',choices=['devices','audit','revoke'])
    parser.add_argument('--device')
    args=parser.parse_args();token=os.environ.get('LUMEN_ADMIN_TOKEN','')
    if len(token)<32: parser.error('Export LUMEN_ADMIN_TOKEN with at least 32 characters.')
    url=urlsplit(args.origin)
    if url.scheme not in ('http','https') or url.username or url.password or url.path not in ('','/') or url.query or url.fragment:parser.error('Provide a companion origin without credentials or a path.')
    if args.action=='revoke' and not args.device:parser.error('--device is required for revocation.')
    path='/api/admin/'+('devices/'+quote(args.device,safe='') if args.action=='revoke' else args.action)
    request=Request(args.origin.rstrip('/')+path,method='DELETE' if args.action=='revoke' else 'GET',headers={'Authorization':'Bearer '+token})
    try:
        with urlopen(request,timeout=10) as response:
            data=response.read(2*1024*1024)
            print(json.dumps(json.loads(data),indent=2) if data else 'Session revoked.')
    except HTTPError as exc:raise SystemExit(f'Companion returned HTTP {exc.code}; check the credential and server configuration.')

if __name__=='__main__':main()
