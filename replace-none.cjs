const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = dir + '/' + file;
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) { 
      results = results.concat(walk(file));
    } else { 
      if (file.endsWith('.tsx')) {
        results.push(file);
      }
    }
  });
  return results;
}

const files = walk('./src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  content = content.replace(/rounded-sm/g, 'rounded-none');
  content = content.replace(/rounded-md/g, 'rounded-none');
  content = content.replace(/rounded-lg/g, 'rounded-none');
  content = content.replace(/rounded-xl/g, 'rounded-none');
  content = content.replace(/rounded-2xl/g, 'rounded-none');
  content = content.replace(/rounded-3xl/g, 'rounded-none');
  fs.writeFileSync(file, content);
});
console.log('Replaced rounded classes with rounded-none');
