var window={}, document={}, localStorage={getItem:function(){return null}};
var fso=new ActiveXObject('Scripting.FileSystemObject');
var f=fso.OpenTextFile('C:\\Users\\seand\\Claude_projects\\KnotLab\\modules\\number-theory.js',1);
var src=f.ReadAll(); f.Close();
try{new Function(src); WScript.Echo('OK');}catch(e){
  WScript.Echo('ERR '+(e.description||e.message)+' line:'+(e.number||'?'));
  // print first 3 lines of stack if present
  for(var k in e){try{WScript.Echo(k+'='+e[k]);}catch(ex){}}
}
