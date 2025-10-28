import fs from 'fs';

function convertProceduresToText(procedures) {
  let output = '# دليل الإجراءات الإدارية\n\n';
  output += 'هذا الدليل يحتوي على جميع الإجراءات الإدارية المتاحة.\n\n';
  output += '---\n\n';

  procedures.forEach((proc, index) => {
    output += `## ${index + 1}. ${proc.thematicTitle} - ${proc.subThematicTitle}\n\n`;
    output += `**رقم الإجراء:** ${proc.procedureId}\n\n`;
    output += `${proc.vectorizedText}\n\n`;
    output += '---\n\n';
  });

  return output;
}

// Usage
try {
  // Read JSON string from text file
  let jsonString = fs.readFileSync('procedures.txt', 'utf-8').trim();

  // Remove surrounding quotes if present (single or double)
  if ((jsonString.startsWith("'") && jsonString.endsWith("'")) ||
      (jsonString.startsWith('"') && jsonString.endsWith('"'))) {
    jsonString = jsonString.slice(1, -1);
  }

  // Process escape sequences (handle \\ first to avoid double-processing)
  jsonString = jsonString
    .replace(/\\\\/g, '\x00')  // Temporarily replace \\ with null char
    .replace(/\\n/g, '\n')
    .replace(/\\t/g, '\t')
    .replace(/\\r/g, '\r')
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\x00/g, '\\');   // Restore single backslashes

  const procedures = JSON.parse(jsonString);

  if (!Array.isArray(procedures)) {
    throw new Error('Input must be a JSON array of procedures');
  }

  console.log(`📚 Found ${procedures.length} procedures`);

  const textContent = convertProceduresToText(procedures);
  fs.writeFileSync('procedures-knowledge-base.txt', textContent, 'utf-8');

  console.log('✅ Created procedures-knowledge-base.txt');
  console.log(`📄 File size: ${(textContent.length / 1024).toFixed(2)} KB`);
  console.log(`📝 Total procedures: ${procedures.length}`);
  console.log('\n🎉 Success! You can now upload "procedures-knowledge-base.txt" to your chatbot\'s Knowledge Base.');
} catch (error) {
  console.error('❌ Error:', error.message);
  if (error.code === 'ENOENT') {
    console.error('💡 Make sure procedures.txt exists in the current directory');
  } else if (error instanceof SyntaxError) {
    console.error('💡 Make sure the JSON string in procedures.txt is valid');
  }
  process.exit(1);
}
