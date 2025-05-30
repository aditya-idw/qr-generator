// client/src/pages/GenerateQr.js
import React from 'react';
import QrForm from '../components/QrForm';
import '../App.css';

export default function GenerateQr() {
  return (
    <div className="page">
      <h1>Generate QR Code</h1>
      <QrForm />
    </div>
  );
}
