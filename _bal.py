import sys
p=sys.argv[1]
with open(p,'r',encoding='utf-8') as f: src=f.read()
out=[]; i=0; n=len(src); BS=chr(92)
while i<n:
    c=src[i]
    if c=='/' and i+1<n and src[i+1]=='/':
        j=src.find(chr(10),i); i=n if j==-1 else j; continue
    if c=='/' and i+1<n and src[i+1]=='*':
        j=src.find('*/',i+2); i=n if j==-1 else j+2; continue
    if c in ('"',chr(39)):
        q=c; i+=1
        while i<n and src[i]!=q:
            if src[i]==BS: i+=2
            else: i+=1
        i+=1; continue
    out.append(c); i+=1
s=''.join(out)
for a,b in [('{','}'),('(',')'),('[',']')]:
    d=s.count(a)-s.count(b); print(a,b,d)
