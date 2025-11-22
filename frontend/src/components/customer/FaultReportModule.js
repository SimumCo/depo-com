import React, { useState, useEffect } from 'react';
import { AlertTriangle, Upload, X, Image as ImageIcon, Send, Clock, CheckCircle, XCircle } from 'lucide-react';
import { faultReportsAPI, productsAPI } from '../../services/api';

const FaultReportModule = () => {
  const [reports, setReports] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    description: '',
    photos: []
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reportsRes, productsRes] = await Promise.all([
        faultReportsAPI.getAll(),
        productsAPI.getAll()
      ]);
      setReports(reportsRes.data);
      setProducts(productsRes.data);
    } catch (err) {
      console.error('Veriler yüklenemedi:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    
    if (formData.photos.length + files.length > 3) {
      alert('Maksimum 3 fotoğraf yükleyebilirsiniz');
      return;
    }

    for (const file of files) {
      if (file.size > 5 * 1024 * 1024) {
        alert(`${file.name} dosyası 5MB'dan büyük!`);
        continue;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          photos: [...prev.photos, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = (index) => {
    setFormData(prev => ({
      ...prev,
      photos: prev.photos.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.product_id || !formData.description) {
      alert('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      setUploading(true);
      await faultReportsAPI.create(formData);
      alert('Arıza bildirimi başarıyla oluşturuldu');
      setFormData({ product_id: '', description: '', photos: [] });
      setShowForm(false);
      loadData();
    } catch (err) {
      alert('Hata: ' + (err.response?.data?.detail || err.message));
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { label: 'Bekliyor', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      in_review: { label: 'İnceleniyor', color: 'bg-blue-100 text-blue-800', icon: Clock },
      resolved: { label: 'Çözüldü', color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { label: 'Reddedildi', color: 'bg-red-100 text-red-800', icon: XCircle }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-orange-500" />
            <h2 className="text-xl font-semibold text-gray-900">Arıza Bildirimleri</h2>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium"
          >
            {showForm ? 'İptal' : '+ Yeni Arıza Bildir'}
          </button>
        </div>
      </div>

      <div className="p-6">
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-6 bg-gray-50 rounded-lg p-6">
            <h3 className="font-medium text-gray-900 mb-4">Arıza Bildirimi Oluştur</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ürün Seçin *
                </label>
                <select
                  value={formData.product_id}
                  onChange={(e) => setFormData({...formData, product_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  required
                >
                  <option value="">Ürün seçin...</option>
                  {products.map(product => (
                    <option key={product.id} value={product.id}>
                      {product.name} ({product.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Arıza Açıklaması *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  rows="4"
                  placeholder="Arızayı detaylı bir şekilde açıklayın..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fotoğraflar (Maksimum 3 adet, her biri 5MB'dan küçük)
                </label>
                
                {formData.photos.length < 3 && (
                  <label className="flex items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer hover:bg-gray-50">
                    <div className="flex flex-col items-center">
                      <Upload className="w-8 h-8 text-gray-400 mb-2" />
                      <span className="text-sm text-gray-500">Fotoğraf yüklemek için tıklayın</span>
                      <span className="text-xs text-gray-400 mt-1">
                        {formData.photos.length}/3 fotoğraf yüklendi
                      </span>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      multiple
                      onChange={handleFileChange}
                    />
                  </label>
                )}

                {formData.photos.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {formData.photos.map((photo, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={photo}
                          alt={`Preview ${index + 1}`}
                          className="w-full h-24 object-cover rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="flex items-center space-x-2 bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{uploading ? 'Gönderiliyor...' : 'Gönder'}</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Reports List */}
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Henüz arıza bildiriminiz yok</p>
            </div>
          ) : (
            reports.map((report) => (
              <div key={report.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-gray-900">{report.product_name}</h3>
                      {getStatusBadge(report.status)}
                    </div>
                    <p className="text-sm text-gray-600">{report.description}</p>
                  </div>
                </div>

                {report.photos && report.photos.length > 0 && (
                  <div className="flex space-x-2 mb-3">
                    {report.photos.map((photo, index) => (
                      <img
                        key={index}
                        src={photo}
                        alt={`Arıza ${index + 1}`}
                        className="w-16 h-16 object-cover rounded cursor-pointer hover:opacity-75"
                      />
                    ))}
                  </div>
                )}

                {report.admin_response && (
                  <div className="bg-blue-50 border-l-4 border-blue-500 p-3 mt-3">
                    <p className="text-sm font-medium text-blue-900 mb-1">Yanıt:</p>
                    <p className="text-sm text-blue-800">{report.admin_response}</p>
                  </div>
                )}

                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                  <span>Oluşturma: {new Date(report.created_at).toLocaleDateString('tr-TR')}</span>
                  {report.resolved_at && (
                    <span>Çözüm: {new Date(report.resolved_at).toLocaleDateString('tr-TR')}</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default FaultReportModule;
