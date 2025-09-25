import QRCode from 'qrcode';

export interface IndividualProductQRData {
  id: string;
  product_id: string;
  product_name: string;
  batch_id: string;
  serial_number: string;
  production_date: string;
  quality_grade: string;
  dimensions: {
    length: number;
    width: number;
    thickness?: number;
  };
  weight: number;
  color: string;
  pattern: string;
  material_composition: string[];
  production_steps: {
    step_name: string;
    completed_at: string;
    operator: string;
    quality_check: boolean;
  }[];
  machine_used: string[];
  inspector: string;
  location?: string;
  status: 'active' | 'sold' | 'damaged' | 'returned';
  notes?: string;
  created_at: string;
}

export interface MainProductQRData {
  product_id: string;
  product_name: string;
  description: string;
  category: string;
  total_quantity: number;
  available_quantity: number;
  recipe: {
    materials: {
      material_id: string;
      material_name: string;
      quantity: number;
      unit: string;
    }[];
    production_time: number;
    difficulty_level: string;
  };
  machines_required: string[];
  production_steps: string[];
  quality_standards: {
    min_weight: number;
    max_weight: number;
    dimensions_tolerance: number;
    quality_criteria: string[];
  };
  created_at: string;
  updated_at: string;
}

export class QRCodeService {
  static async generateIndividualProductQR(data: IndividualProductQRData): Promise<string> {
    try {
      // Create URL that points to our UI page
      const baseUrl = window.location.origin;
      const qrData = {
        type: 'individual',
        productId: data.product_id,
        individualProductId: data.id
      };
      const qrUrl = `${baseUrl}/qr-result?data=${encodeURIComponent(JSON.stringify(qrData))}`;

      const qrCodeDataURL = await QRCode.toDataURL(qrUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating individual product QR code:', error);
      throw new Error('Failed to generate QR code for individual product');
    }
  }

  static async generateMainProductQR(data: MainProductQRData): Promise<string> {
    try {
      // Create URL that points to our UI page
      const baseUrl = window.location.origin;
      const qrData = {
        type: 'main',
        productId: data.product_id
      };
      const qrUrl = `${baseUrl}/qr-result?data=${encodeURIComponent(JSON.stringify(qrData))}`;

      const qrCodeDataURL = await QRCode.toDataURL(qrUrl, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });

      return qrCodeDataURL;
    } catch (error) {
      console.error('Error generating main product QR code:', error);
      throw new Error('Failed to generate QR code for main product');
    }
  }

  static parseQRData(qrString: string): { type: string; data: any; timestamp: string } | null {
    try {
      const parsed = JSON.parse(qrString);
      if (parsed.type && parsed.data && parsed.timestamp) {
        return parsed;
      }
      return null;
    } catch (error) {
      console.error('Error parsing QR code data:', error);
      return null;
    }
  }

  static async generateBatchQR(data: string[]): Promise<string[]> {
    try {
      const promises = data.map(item =>
        QRCode.toDataURL(item, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 200
        })
      );

      return await Promise.all(promises);
    } catch (error) {
      console.error('Error generating batch QR codes:', error);
      throw new Error('Failed to generate batch QR codes');
    }
  }

  static downloadQRCode(dataURL: string, filename: string): void {
    const link = document.createElement('a');
    link.href = dataURL;
    link.download = `${filename}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  static printQRCode(dataURL: string): void {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>QR Code Print</title>
            <style>
              body { margin: 0; padding: 20px; text-align: center; }
              img { max-width: 100%; height: auto; }
              @media print {
                body { margin: 0; padding: 0; }
              }
            </style>
          </head>
          <body>
            <img src="${dataURL}" alt="QR Code" />
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.print();
    }
  }
}