import React, { useState, useEffect } from 'react';
import { Tag, Calendar, TrendingDown, AlertCircle } from 'lucide-react';
import { campaignsAPI } from '../../services/api';

const CampaignsModule = () => {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadCampaigns();
  }, []);

  const loadCampaigns = async () => {
    try {
      setLoading(true);
      const response = await campaignsAPI.getAll();
      setCampaigns(response.data);
    } catch (err) {
      setError('Kampanyalar yüklenemedi');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const getDaysRemaining = (endDate) => {
    const end = new Date(endDate);
    const now = new Date();
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
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
        <div className="flex items-center space-x-2">
          <Tag className="w-5 h-5 text-orange-500" />
          <h2 className="text-xl font-semibold text-gray-900">Kampanyalar & İndirimler</h2>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded">
            <AlertCircle className="w-5 h-5" />
            <span>{error}</span>
          </div>
        )}

        {campaigns.length === 0 ? (
          <div className="text-center py-12">
            <Tag className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Şu anda aktif kampanya bulunmamaktadır</p>
            <p className="text-sm text-gray-400 mt-2">Yeni kampanyalardan haberdar olmak için bildirimleri açık tutun</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {campaigns.map((campaign) => {
              const daysRemaining = getDaysRemaining(campaign.end_date);
              const isExpiringSoon = daysRemaining <= 3;

              return (
                <div
                  key={campaign.id}
                  className={`border-2 rounded-lg p-5 transition-all hover:shadow-md ${
                    isExpiringSoon 
                      ? 'border-red-300 bg-red-50' 
                      : 'border-orange-300 bg-gradient-to-br from-orange-50 to-yellow-50'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-lg text-gray-900 flex items-center space-x-2">
                        <span>{campaign.title}</span>
                        {campaign.discount_percentage > 0 && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-600 text-white">
                            <TrendingDown className="w-3 h-3 mr-1" />
                            %{campaign.discount_percentage} İndirim
                          </span>
                        )}
                      </h3>
                    </div>
                  </div>

                  <p className="text-gray-700 text-sm mb-4 leading-relaxed">
                    {campaign.description}
                  </p>

                  <div className="flex items-center justify-between text-sm border-t border-gray-200 pt-3">
                    <div className="flex items-center space-x-1 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>{formatDate(campaign.start_date)} - {formatDate(campaign.end_date)}</span>
                    </div>
                    {isExpiringSoon ? (
                      <span className="text-red-600 font-semibold">
                        Son {daysRemaining} gün!
                      </span>
                    ) : (
                      <span className="text-gray-500">
                        {daysRemaining} gün kaldı
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default CampaignsModule;
