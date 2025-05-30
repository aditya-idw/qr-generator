import React from 'react';
import QrForm from '../components/QrForm';  // reuse earlier form component

export default function GenerateQr() {
  return (
    <div className="page">
      <h1>Generate QR Code</h1>
      <QrForm />
    </div>
  );
}
