const express = require('express');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

// Ana sayfa
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// PDF oluştur
app.post('/api/generate-pdf', (req, res) => {
  try {
    console.log('📄 PDF oluşturma işlemi başlatıldı');
    
    const cvData = req.body;
    const doc = new PDFDocument({
      size: 'A4',
      margin: 50,
      bufferPages: true // Sayfa numaralarını doğru yerleştirmek için gerekli
    });

    // Font Dosyaları (Türkçe karakter desteği için fonts klasöründe olmalı)
    const regularFontPath = path.join(__dirname, 'fonts', 'Roboto-Regular.ttf');
    const boldFontPath = path.join(__dirname, 'fonts', 'Roboto-Bold.ttf');
    
    doc.registerFont('Custom-Regular', regularFontPath);
    doc.registerFont('Custom-Bold', boldFontPath);

    // Yanıt başlıkları
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="ATS-CV.pdf"');

    doc.pipe(res);

    // --- HEADER (İSİM VE ÜNVAN) ---
    doc.font('Custom-Bold').fontSize(28).fillColor('#000000').text(cvData.personal.name || 'ÖZGEÇMİŞ');
    doc.font('Custom-Regular').fontSize(16).fillColor('#34495e').text(cvData.personal.title || '');
    doc.moveDown(0.5);

    // --- İLETİŞİM BİLGİLERİ ---
    doc.fillColor('#000000').fontSize(10);
    const contacts = [];
    if (cvData.personal.email) contacts.push(cvData.personal.email);
    if (cvData.personal.phone) contacts.push(cvData.personal.phone);
    if (cvData.personal.linkedin) contacts.push(cvData.personal.linkedin);
    
    doc.text(contacts.join('  |  '));
    doc.moveDown(1);
    
    // Ayırıcı Çizgi
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#bdc3c7').lineWidth(0.5).stroke();
    doc.moveDown(1.5);

    // --- YARDIMCI FONKSİYON: SAYFA KONTROLÜ ---
    const checkPageBreak = (neededHeight) => {
      if (doc.y + neededHeight > 760) {
        doc.addPage();
      }
    };

    // --- DENEYİM BÖLÜMÜ ---
    if (cvData.experience && cvData.experience.length > 0) {
      doc.font('Custom-Bold').fontSize(16).fillColor('#2980b9').text('DENEYİM');
      doc.moveDown(0.5);

      cvData.experience.forEach((exp) => {
        if (exp.title) {
          checkPageBreak(80);
          
          doc.font('Custom-Bold').fontSize(12).fillColor('#000000').text(exp.title.toUpperCase());
          
          const companyLine = `${exp.company || ''}  |  ${exp.duration || ''}`;
          doc.font('Custom-Bold').fontSize(10).fillColor('#7f8c8d').text(companyLine);
          
          doc.moveDown(0.3);
          
          if (exp.description) {
            doc.font('Custom-Regular').fontSize(10).fillColor('#2c3e50').text(exp.description, {
              width: 495,
              align: 'justify',
              lineGap: 3
            });
          }
          doc.moveDown(1);
        }
      });
    }

    // --- EĞİTİM BÖLÜMÜ ---
    if (cvData.education && cvData.education.length > 0) {
      checkPageBreak(60);
      doc.font('Custom-Bold').fontSize(16).fillColor('#2980b9').text('EĞİTİM');
      doc.moveDown(0.5);

      cvData.education.forEach((edu) => {
        if (edu.degree) {
          checkPageBreak(50);
          doc.font('Custom-Bold').fontSize(11).fillColor('#000000').text(edu.degree);
          doc.font('Custom-Regular').fontSize(10).fillColor('#2c3e50').text(`${edu.institution || ''} | ${edu.year || ''}`);
          doc.moveDown(0.8);
        }
      });
    }

    // --- BECERİLER BÖLÜMÜ (GÜNCELLENDİ) ---
    const validSkills = cvData.skills.filter(s => s && s.trim() !== '');
    if (validSkills.length > 0) {
      checkPageBreak(60);
      doc.moveDown(0.5);
      doc.font('Custom-Bold').fontSize(16).fillColor('#2980b9').text('BECERİLER');
      doc.moveDown(0.5);
      
      // Beceriler arasına daha fazla boşluk ve satır aralığı eklendi
      doc.font('Custom-Regular').fontSize(10).fillColor('#2c3e50')
         .text(validSkills.join('   •   '), { 
            width: 495,
            lineGap: 6,
            align: 'left'
         });
    }

    // --- FOOTER (SAYFA NUMARALARI DÜZELTİLDİ) ---
    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.fontSize(8).fillColor('#95a5a6').text(
        `Sayfa ${i + 1} / ${pages.count}`,
        50,
        810,
        { align: 'center' }
      );
    }

    doc.end();
    console.log('✅ PDF başarıyla oluşturuldu ve gönderildi.');
    
  } catch (error) {
    console.error('❌ Kritik Hata:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Sunucu hatası: ' + error.message });
    }
  }
});


app.listen(PORT, () => {
  console.log(`\n🚀 ATS CV Sunucusu Çalışıyor: http://localhost:${PORT}`);
});