import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const InvoiceUpload = ({ onSuccess }) => {
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadedInvoiceDetails, setUploadedInvoiceDetails] = useState(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setHtmlContent(event.target.result);
        setUploadedInvoiceDetails(null);  // Reset details
        toast.success('Dosya yüklendi, şimdi "Faturayı Yükle" butonuna tıklayın');
      };
      reader.readAsText(file);
    }
  };

  const handleUpload = async () => {
    if (!htmlContent) {
      toast.error('Lütfen bir HTML dosyası seçin');
      return;
    }

    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
        return;
      }

      console.log('Token:', token ? 'Var' : 'Yok');
      console.log('HTML Content Length:', htmlContent.length);
      
      const response = await axios.post(
        `${BACKEND_URL}/api/invoices/upload`,
        { html_content: htmlContent },
        { 
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          } 
        }
      );

      console.log('Upload response:', response.data);

      // Başarılı yükleme sonrası detayları göster
      const invoiceData = response.data;
      
      // HTML'den basit parse yaparak bilgileri çıkar
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlContent, 'text/html');
      const textContent = doc.body.textContent || '';
      
      // Müşteri adını bul
      let customerName = 'Müşteri Adı Bulunamadı';
      const customerIdTable = doc.querySelector('#customerIDTable');
      if (customerIdTable) {
        const boldSpan = customerIdTable.querySelector('span[style*="font-weight:bold"]');
        if (boldSpan) {
          customerName = boldSpan.textContent.trim();
        }
      }
      
      // Alternatif: ALICI kelimesinden sonra gelen firma adı
      if (customerName === 'Müşteri Adı Bulunamadı') {
        const customerMatch = textContent.match(/ALICI[:\s]*([A-ZÇĞİÖŞÜ\s]+(?:ANONİM ŞİRKETİ|LİMİTED ŞİRKETİ|TİCARET|SANAYİ))/i);
        if (customerMatch) {
          customerName = customerMatch[1].trim();
        }
      }
      
      // Fatura numarasını bul (SED veya EE formatı)
      const invoiceNumMatch = textContent.match(/(?:Fatura\s*No\s*[:\-]?\s*)?([A-Z]{2,3}\d{10,})/i);
      const invoiceNumber = invoiceNumMatch ? invoiceNumMatch[1] : 'Fatura No Bulunamadı';
      
      // Vergi numarasını bul (VKN pattern)
      let taxId = 'Vergi No Bulunamadı';
      if (customerIdTable) {
        const vknCell = Array.from(customerIdTable.querySelectorAll('td'))
          .find(td => td.textContent.includes('VKN:'));
        if (vknCell) {
          const vknMatch = vknCell.textContent.match(/VKN:?\s*(\d{10,11})/);
          if (vknMatch) {
            taxId = vknMatch[1];
          }
        }
      }
      
      // Alternatif VKN arama
      if (taxId === 'Vergi No Bulunamadı') {
        const taxIdMatch = textContent.match(/VKN[:\s]*(\d{10,11})/i);
        if (taxIdMatch) {
          taxId = taxIdMatch[1];
        }
      }
      
      // Tarih bul (çeşitli formatları dene)
      let invoiceDate = 'Tarih Bulunamadı';
      
      // Format 1: DD/MM/YYYY veya DD.MM.YYYY formatı
      const dateMatch1 = textContent.match(/(?:Fatura\s*Tarihi|Tarih)[:\s]*(\d{1,2})[\/\.\-](\d{1,2})[\/\.\-](\d{4})/i);
      if (dateMatch1) {
        invoiceDate = `${dateMatch1[1]}/${dateMatch1[2]}/${dateMatch1[3]}`;
      } else {
        // Format 2: DDMMYYYY (boşluksuz 8 haneli)
        const dateMatch2 = textContent.match(/(?:Fatura\s*Tarihi|FaturaTarihi)[:\s]*(\d{2})(\d{2})(\d{4})/i);
        if (dateMatch2) {
          invoiceDate = `${dateMatch2[1]}/${dateMatch2[2]}/${dateMatch2[3]}`;
        } else {
          // Format 3: DD MM YYYY formatı (boşluklarla)
          const dateMatch3 = textContent.match(/(\d{1,2})\s+(\d{1,2})\s+(\d{4})/);
          if (dateMatch3) {
            invoiceDate = `${dateMatch3[1]}/${dateMatch3[2]}/${dateMatch3[3]}`;
          }
        }
      }
      
      // Tutarları bul (TL ile biten)
      const amounts = textContent.match(/[\d\.,]+\s*TL/g);
      const grandTotal = amounts && amounts.length > 0 ? amounts[amounts.length - 1] : 'Tutar Bulunamadı';
      
      // Ürün bilgilerini çıkar - HEM TABLE HEM PDF2HTMLEX DESTEĞİ
      const products = [];
      
      // Önce normal table yapısını dene
      const tables = doc.querySelectorAll('table');
      console.log('Toplam tablo sayısı:', tables.length);
      
      if (tables.length > 0) {
        tables.forEach((table, tableIdx) => {
          const rows = table.querySelectorAll('tr');
          console.log(`Tablo ${tableIdx + 1} - Satır sayısı:`, rows.length);
          
          rows.forEach((row, rowIdx) => {
            const cells = row.querySelectorAll('td, th');
            if (cells.length === 0) return;
            
            const rowText = row.textContent.toLowerCase();
            const isHeader = rowText.includes('ürün') || 
                            rowText.includes('adet') || 
                            rowText.includes('miktar') ||
                            rowText.includes('fiyat') ||
                            rowText.includes('toplam') ||
                            (rowIdx === 0 && cells.length >= 3);
            
            if (isHeader) {
              console.log(`Header satır atlandı (row ${rowIdx}):`, rowText);
              return;
            }
            
            if (cells.length >= 2) {
              const cellValues = Array.from(cells).map(c => c.textContent?.trim() || '');
              const hasNumber = cellValues.some(val => /\d+/.test(val));
              
              if (hasNumber && cellValues[0] && cellValues[0].length > 2) {
                const productName = cellValues[0];
                let quantity = '-';
                let unitPrice = '-';
                let total = '-';
                
                for (let i = 1; i < cellValues.length; i++) {
                  const val = cellValues[i];
                  if (/^\d+$/.test(val)) {
                    if (quantity === '-') quantity = val;
                  } else if (/[\d\.,]+/.test(val)) {
                    if (unitPrice === '-') unitPrice = val;
                    else if (total === '-') total = val;
                  }
                }
                
                products.push({
                  product_name: productName,
                  quantity: quantity,
                  unit_price: unitPrice,
                  total: total
                });
                
                console.log('Table - Ürün eklendi:', { productName, quantity, unitPrice, total });
              }
            }
          });
        });
      }
      
      // Eğer table parsing başarısızsa, pdf2htmlEX formatını dene
      if (products.length === 0) {
        console.log('Table parsing başarısız, pdf2htmlEX format parsing deneniyor...');
        
        // Tüm text içeriğini al
        const allSpans = doc.querySelectorAll('span, div');
        const texts = Array.from(allSpans)
          .map(el => el.textContent?.trim())
          .filter(text => text && text.length > 0);
        
        console.log('Toplam text eleman sayısı:', texts.length);
        
        // Boşlukları temizlenmiş metinlerde arama yap
        // Pattern: Ürün Kodu (8-10 haneli) ardından ürün adı, miktar, fiyat
        
        for (let i = 0; i < texts.length - 4; i++) {
          const current = texts[i];
          
          // Ürün kodu pattern (sadece 8-10 haneli sayı)
          if (/^\d{8,10}$/.test(current)) {
            const productCode = current;
            
            // Sonraki elemanları kontrol et
            const next1 = texts[i + 1] || '';
            const next2 = texts[i + 2] || '';
            const next3 = texts[i + 3] || '';
            const next4 = texts[i + 4] || '';
            
            // Ürün adı: uzun text, sayı veya TL içermemeli (boşluksuz olabilir: "1000GRVAKUMLU")
            let productName = '';
            let startIdx = i + 1;
            
            // Ürün adını bul (birden fazla parça olabilir)
            for (let j = i + 1; j < i + 5 && j < texts.length; j++) {
              const text = texts[j];
              // Eğer Adet, TL, rakam içermiyorsa ürün adının parçasıdır
              if (text.length > 2 && !/(Adet|TL|\d{1,2}\s*Adet|\d+,\d+|%|\d+\.\d+)/i.test(text)) {
                productName += (productName ? ' ' : '') + text;
                startIdx = j + 1;
              } else {
                break;
              }
            }
            
            if (!productName || productName.length < 3) {
              continue;
            }
            
            // Miktar ve fiyat bul
            let quantity = '-';
            let unitPrice = '-';
            let total = '-';
            
            // Sonraki birkaç elemanı tara
            for (let j = startIdx; j < Math.min(startIdx + 6, texts.length); j++) {
              const text = texts[j];
              
              // Miktar pattern: "10Adet" veya "10 Adet"
              const qtyMatch = text.match(/^(\d+)\s*(Adet|KG|Gr|Lt|ml)/i);
              if (qtyMatch && quantity === '-') {
                quantity = text;
                continue;
              }
              
              // Fiyat pattern: "433,17TL" veya "433,17 TL"
              const priceMatch = text.match(/([\d\.,]+)\s*TL/i);
              if (priceMatch) {
                if (unitPrice === '-') {
                  unitPrice = text;
                } else if (total === '-') {
                  // Toplam satır genelde başka yerde, son büyük rakam olabilir
                  total = text;
                }
              }
              
              // Toplam pattern: "4.331,70" gibi noktalı rakam
              if (/^\d{1,3}\.\d{3},\d{2}$/.test(text) && total === '-') {
                total = text + ' TL';
              }
            }
            
            products.push({
              product_name: productName,
              quantity: quantity,
              unit_price: unitPrice,
              total: total
            });
            
            console.log('PDF2HTML - Ürün eklendi:', {
              productCode,
              productName,
              quantity,
              unitPrice,
              total
            });
            
            // Bir sonraki ürüne geç
            i = startIdx + 5;
          }
        }
      }
      
      console.log('Toplam ürün sayısı:', products.length);
      console.log('Ürünler:', products);
      
      setUploadedInvoiceDetails({
        invoice_id: invoiceData.invoice_id || 'N/A',
        invoice_number: invoiceNumber,
        invoice_date: invoiceDate,
        customer_tax_id: taxId,
        products: products,
        grand_total: grandTotal
      });

      toast.success('Fatura başarıyla yüklendi!');
      setHtmlContent('');
      document.getElementById('file-input').value = '';
      
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error('Error uploading invoice:', err);
      console.error('Error response:', err.response?.data);
      
      if (err.response?.status === 401) {
        toast.error('Oturum süresi dolmuş. Lütfen tekrar giriş yapın.');
      } else if (err.response?.status === 403) {
        toast.error('Bu işlem için yetkiniz yok. Muhasebe hesabı ile giriş yapın.');
      } else {
        toast.error(err.response?.data?.detail || 'Fatura yüklenirken hata oluştu');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Fatura Yükleme</h1>
        <p className="text-gray-600 mt-2">HTML formatında e-fatura yükleyin</p>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* File Upload */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            HTML Fatura Dosyası *
          </label>
          <input
            id="file-input"
            type="file"
            accept=".html,.htm"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500
              file:mr-4 file:py-2 file:px-4
              file:rounded-full file:border-0
              file:text-sm file:font-semibold
              file:bg-blue-50 file:text-blue-700
              hover:file:bg-blue-100"
          />
          <p className="text-xs text-gray-500 mt-1">
            ✓ E-fatura HTML dosyasını seçin (.html veya .htm)
          </p>
        </div>

        {/* Preview */}
        {htmlContent && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Önizleme
            </label>
            <div className="border rounded-lg p-4 max-h-64 overflow-y-auto bg-gray-50">
              <div dangerouslySetInnerHTML={{ __html: htmlContent.substring(0, 500) + '...' }} />
            </div>
            <p className="text-xs text-green-600 mt-1">
              ✓ Dosya hazır, yüklemek için aşağıdaki butona tıklayın
            </p>
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={handleUpload}
          disabled={loading || !htmlContent}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Yükleniyor...
            </span>
          ) : (
            'Faturayı Yükle'
          )}
        </button>

        {/* Yüklenen Fatura Detayları (Test Amaçlı) */}
        {uploadedInvoiceDetails && (
          <div className="mt-6 border-t pt-6">
            <h3 className="text-lg font-semibold mb-4 text-green-700">
              ✅ Fatura Başarıyla Yüklendi - Test Detayları
            </h3>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Fatura No:</span>
                  <p className="text-gray-900">{uploadedInvoiceDetails.invoice_number || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Fatura Tarihi:</span>
                  <p className="text-gray-900">{uploadedInvoiceDetails.invoice_date || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Vergi No:</span>
                  <p className="text-gray-900">{uploadedInvoiceDetails.customer_tax_id || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-700">Toplam Tutar:</span>
                  <p className="text-gray-900 font-semibold">{uploadedInvoiceDetails.grand_total || 'N/A'}</p>
                </div>
              </div>

              {uploadedInvoiceDetails.products && uploadedInvoiceDetails.products.length > 0 && (
                <div className="mt-4">
                  <span className="font-medium text-gray-700 block mb-2">Ürünler:</span>
                  <div className="bg-white rounded border p-3 max-h-48 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left pb-2">Ürün Adı</th>
                          <th className="text-right pb-2">Adet</th>
                          <th className="text-right pb-2">Birim Fiyat</th>
                          <th className="text-right pb-2">Toplam</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadedInvoiceDetails.products.map((product, idx) => (
                          <tr key={idx} className="border-b last:border-0">
                            <td className="py-2">{product.product_name}</td>
                            <td className="text-right">{product.quantity}</td>
                            <td className="text-right">{product.unit_price}</td>
                            <td className="text-right font-medium">{product.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 border-l-4 border-blue-500 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              <strong>Not:</strong> Yalnızca HTML formatındaki e-fatura dosyalarını yükleyebilirsiniz.
              Fatura otomatik olarak ilgili müşteriye atanacaktır.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceUpload;
