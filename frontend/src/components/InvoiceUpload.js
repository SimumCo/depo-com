import React, { useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

const InvoiceUpload = () => {
  const [htmlContent, setHtmlContent] = useState('');
  const [loading, setLoading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setHtmlContent(event.target.result);
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
      const token = localStorage.getItem('access_token');
      
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

      toast.success('Fatura başarıyla yüklendi!');
      setHtmlContent('');
      // Reset file input
      document.getElementById('file-input').value = '';
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
