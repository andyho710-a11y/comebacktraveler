"""Private, read-only RFQ inspection. Uses the operator's existing gcloud login.
No service account key, write, outbound notification, analytics or remote logging.
Default summaries omit company/contact/free text. --details requires an exact RFQ ID.
"""
import argparse, json, re, shutil, subprocess, urllib.parse, urllib.request, urllib.error
PROJECT='comeback-traveler-web'; DATABASE='rfq-intake'
def decode(value):
    if 'mapValue' in value:return {k:decode(v) for k,v in value['mapValue'].get('fields',{}).items()}
    if 'arrayValue' in value:return [decode(v)for v in value['arrayValue'].get('values',[])]
    if 'integerValue' in value:return int(value['integerValue'])
    for key in ['stringValue','timestampValue','booleanValue','doubleValue','nullValue']:
        if key in value:return value[key]
    return value
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--details',help='Exact RFQ ID; prints private record only in your local terminal');args=parser.parse_args()
    executable=shutil.which('gcloud.cmd') or shutil.which('gcloud')
    if not executable:raise SystemExit('Install official gcloud CLI and sign in as the approved private operator.')
    access=subprocess.check_output([executable,'auth','print-access-token'],text=True).strip()
    base=f'https://firestore.googleapis.com/v1/projects/{PROJECT}/databases/{DATABASE}/documents/rfqs'
    def get(url):
        try:
            with urllib.request.urlopen(urllib.request.Request(url,headers={'Authorization':'Bearer '+access}),timeout=30)as response:return json.load(response)
        except urllib.error.HTTPError as error:raise SystemExit(f'Private inspection failed: HTTP {error.code}. Check operator IAM; never relax browser rules.')
    if args.details:
        if not re.fullmatch(r'RFQ-\d{8}-[a-f0-9]{32}',args.details):raise SystemExit('Invalid RFQ ID.')
        doc=get(base+'/'+args.details);print(json.dumps({k:decode(v)for k,v in doc['fields'].items()},ensure_ascii=False,indent=2));return
    records=[];page=''
    for _ in range(10):
        result=get(base+'?'+urllib.parse.urlencode({'pageSize':100,'pageToken':page}));records.extend(result.get('documents',[]));page=result.get('nextPageToken','')
        if not page:break
    if page:raise SystemExit('More than 1000 RFQs: use private Console; do not treat this bounded list as complete.')
    safe=[]
    for document in records:
        fields={k:decode(v)for k,v in document['fields'].items()}
        safe.append({k:fields.get(k)for k in ['rfq_id','created_at','updated_at','status']}|{'product_category':fields.get('product',{}).get('category')})
    print(json.dumps(sorted(safe,key=lambda x:x.get('created_at',''),reverse=True),ensure_ascii=False,indent=2))
if __name__=='__main__':main()
