// services/ocrService.js

const { createWorker } = require('tesseract.js');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');



class OCRService {
 constructor() {
   this.worker = null;
 }

 async initWorker() {
  try {
    const worker = await createWorker();
    await worker.loadLanguage(['tur']); // Dil parametresini array olarak gönder
    await worker.initialize('tur');
    this.worker = worker;
    console.log('OCR servisi başlatıldı');
  } catch (error) {
    console.error('OCR başlatma hatası:', error);
    throw error;
  }
}

  async ensureWorkerInitialized() {
    if (!this.worker) {
      await this.initWorker();
    }
  }

  
  
  async convertToJpeg(inputPath) {
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file is missing: ${inputPath}`);
    }
  
    const outputPath = inputPath.replace(/\.[^.]+$/, '_converted.jpg');
  
    try {
      await sharp(inputPath)
        .resize({ width: 1200 }) // Çözünürlük artırma
        .grayscale()             // Gri tonlama
        .normalize()             // Kontrast normalizasyonu
        .toFile(outputPath);
  
      return outputPath;
    } catch (error) {
      console.error('Format dönüştürme hatası:', error);
      throw new Error('Resim dönüştürme başarısız');
    }
  }
  
  

  cleanText(text) {
    return text
      .replace(/[^a-zA-Z0-9ğüşıöçĞÜŞİÖÇ\s.,:\/-]/g, '') // Geçersiz karakterleri kaldır
      .replace(/\s+/g, ' ')                              // Fazla boşlukları azalt
      .trim();                                           // Baş ve sondaki boşlukları temizle
  }
  

  async extractTextFromImage(imagePath) {
    try {
      await this.ensureWorkerInitialized();
      console.log('OCR başlatılıyor:', imagePath);
  
      if (!this.worker) {
        await this.initWorker();
      }
  
      if (!fs.existsSync(imagePath)) {
        throw new Error(`Input file is missing: ${imagePath}`);
      }
  
      const jpegPath = await this.convertToJpeg(imagePath);
      console.log('JPEG formatına dönüştürüldü:', jpegPath);
  
      const { data: { text } } = await this.worker.recognize(jpegPath);
      console.log('Ham metin:', text);
  
      if (fs.existsSync(jpegPath)) {
        fs.unlinkSync(jpegPath);
      }
  
      const cleanText = this.cleanText(text);
      console.log('Temizlenmiş metin:', cleanText);
  
      const result = this.parseExpenseData(cleanText);
      console.log('Ayrıştırılan veri:', result);
  
      return result;
    } catch (error) {
      console.error('OCR hatası:', error);
      throw new Error(`OCR işlemi başarısız: ${error.message}`);
    }
  }
  
  



parseExpenseData(text) {
  return {
    amount: this.extractAmount(text),
    date: this.extractDate(text),
    vendor: this.extractVendor(text),
    items: this.extractItems(text)
  };
}


extractAmount(text) {
  const patterns = [
    /toplam[:\s]*([\d.,]+)/i,    // TOPLAM: 449,97
    /nakit[:\s]*([\d.,]+)/i,     // NAKIT: 449,97
    /([\d.,]+)\s?TL/i,           // 449,97 TL
    /k\.benzin[:\s]*([\d.,]+)/i  // K.BENZİN: 449,97 gibi
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }
  }
  return null;
}

extractDate(text) {
  const patterns = [
    /(\d{2})[\/.](\d{2})[\/.](\d{4})/,  // 23.11.2024
    /(\d{4})[\/.](\d{2})[\/.](\d{2})/,  // 2024/11/23
    /\b(\d{2})\s(\w+)\s(\d{4})\b/      // 23 Kasım 2024 (Türkçe aylar)
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      // Türkçe ayları parse etmek için ek kontrol
      const turkishMonths = {
        Ocak: '01',
        Şubat: '02',
        Mart: '03',
        Nisan: '04',
        Mayıs: '05',
        Haziran: '06',
        Temmuz: '07',
        Ağustos: '08',
        Eylül: '09',
        Ekim: '10',
        Kasım: '11',
        Aralık: '12'
      };

      if (match[2] in turkishMonths) {
        return `${match[3]}-${turkishMonths[match[2]]}-${match[1]}`;
      }
      return `${match[3]}-${match[2]}-${match[1]}`;
    }
  }
  return null;
}




extractVendor(text) {
  const patterns = [
    /shell petrol/i,   // Shell Petrol gibi yaygın satıcı isimleri
    /tezgâh[:\s]*([\w\s]+)/i // Tezgâh: ... gibi
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return match[0].trim();
    }
  }

  // İlk satırı yedek olarak kullan
  const lines = text.split('\n');
  return lines[0]?.trim() || null;
}


  extractItems(text) {
    const items = [];
    const lines = text.split('\n');
    
    for (const line of lines) {
      const itemMatch = line.match(/(.+?)\s([\d.,]+)\s?TL?$/i);
      if (itemMatch) {
        items.push({
          description: itemMatch[1].trim(),
          amount: parseFloat(itemMatch[2].replace(',', '.'))
        });
      }
    }
    return items;
  }
}

module.exports = new OCRService();