"use client";
import React from 'react';
import { MockupData } from '@/lib/mockups';

interface MockupRendererProps {
  mockupData: MockupData;
}

export function MockupRenderer({ mockupData }: MockupRendererProps) {
  if (!mockupData) {
    return null;
  }

  const renderContent = () => {
    switch (mockupData.type) {
      case 'wireframe':
        return (
          <div className="border rounded-lg bg-gray-50 p-4">
            <h4 className="font-semibold text-sm mb-2">🎨 UI Mockup</h4>
            {mockupData.imageUrl && (
              <img 
                src={mockupData.imageUrl} 
                alt="UI Mockup" 
                className="w-full max-w-md rounded mb-2"
              />
            )}
            <div className="text-xs space-y-1">
              {mockupData.screens && (
                <div><strong>Screens:</strong> {Array.isArray(mockupData.screens) ? mockupData.screens.join(', ') : mockupData.screens}</div>
              )}
              {mockupData.style && (
                <div><strong>Style:</strong> {mockupData.style}</div>
              )}
            </div>
          </div>
        );

      case 'architecture':
        return (
          <div className="border rounded-lg bg-blue-50 p-4">
            <h4 className="font-semibold text-sm mb-2">⚙️ Tech Stack</h4>
            <div className="text-xs space-y-1">
              {mockupData.technologies && (
                <div><strong>Technologies:</strong> {Array.isArray(mockupData.technologies) ? mockupData.technologies.join(', ') : mockupData.technologies}</div>
              )}
              {mockupData.timeline && (
                <div><strong>Timeline:</strong> {mockupData.timeline}</div>
              )}
              {mockupData.complexity && (
                <div><strong>Complexity:</strong> {mockupData.complexity}</div>
              )}
            </div>
          </div>
        );

      case 'planning':
        return (
          <div className="border rounded-lg bg-green-50 p-4">
            <h4 className="font-semibold text-sm mb-2">📋 Project Plan</h4>
            {mockupData.phases && Array.isArray(mockupData.phases) && (
              <div className="overflow-x-auto">
                <table className="text-xs w-full border-collapse">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-1">Phase</th>
                      <th className="text-left p-1">Duration</th>
                      <th className="text-left p-1">Resources</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockupData.phases.map((phase: any, index: number) => (
                      <tr key={index} className="border-b">
                        <td className="p-1">{phase.name}</td>
                        <td className="p-1">{phase.duration}</td>
                        <td className="p-1">{phase.resources}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {mockupData.budget && (
              <div className="text-xs mt-2"><strong>Budget:</strong> {mockupData.budget}</div>
            )}
          </div>
        );

      case 'product':
        return (
          <div className="border rounded-lg bg-purple-50 p-4">
            <h4 className="font-semibold text-sm mb-2">📊 Product Metrics</h4>
            <div className="text-xs space-y-1">
              {mockupData.kpis && (
                <div><strong>KPIs:</strong> {Array.isArray(mockupData.kpis) ? mockupData.kpis.join(', ') : mockupData.kpis}</div>
              )}
              {mockupData.features && (
                <div><strong>Features:</strong> {Array.isArray(mockupData.features) ? mockupData.features.join(', ') : mockupData.features}</div>
              )}
            </div>
          </div>
        );

      case 'business':
        return (
          <div className="border rounded-lg bg-yellow-50 p-4">
            <h4 className="font-semibold text-sm mb-2">💰 Business Model</h4>
            <div className="text-xs space-y-1">
              {mockupData.revenue && (
                <div><strong>Revenue:</strong> {mockupData.revenue}</div>
              )}
              {mockupData.roi && (
                <div><strong>ROI:</strong> {mockupData.roi}</div>
              )}
              {mockupData.model && (
                <div><strong>Model:</strong> {mockupData.model}</div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="border rounded-lg bg-gray-50 p-4">
            <h4 className="font-semibold text-sm mb-2">📄 Data</h4>
            <pre className="text-xs overflow-auto">{JSON.stringify(mockupData, null, 2)}</pre>
          </div>
        );
    }
  };

  return (
    <div className="mt-2">
      {renderContent()}
    </div>
  );
}