// GST API Service for fetching customer details from GST number
// Using RapidAPI GST Insights API

interface GSTAddress {
  buildingName?: string;
  street?: string;
  location?: string;
  buildingNumber?: string;
  district?: string;
  stateCode?: string;
  city?: string;
  floorNumber?: string;
  locality?: string;
  pincode?: string;
  landmark?: string;
}

interface GSTPrincipalAddress {
  address: GSTAddress;
  nature?: string;
}

interface GSTData {
  stateJurisdictionCode?: string;
  taxType?: string;
  stateJurisdiction?: string;
  legalName?: string;
  additionalAddress?: any[];
  cancelledDate?: string;
  natureOfBusinessActivity?: string[];
  gstNumber?: string;
  lastUpdateDate?: string;
  constitutionOfBusiness?: string;
  registrationDate?: string;
  principalAddress?: GSTPrincipalAddress;
  centerJurisdictionCode?: string;
  tradeName?: string;
  status?: string;
  centerJurisdiction?: string;
}

interface GSTApiResponse {
  success: boolean;
  data: GSTData[] | GSTData;
  generatedTimeStamps?: number;
}

export interface GSTCustomerDetails {
  name: string;
  companyName: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  gstNumber: string;
  businessType: string;
  status: string;
}

export class GSTApiService {
  private static readonly RAPIDAPI_HOST = 'gst-insights-api.p.rapidapi.com';
  private static readonly RAPIDAPI_KEY = 'e4f2d542c6msh938d54b2df58d0ap188f98jsnece10a56caaa';
  private static readonly BASE_URL = 'https://gst-insights-api.p.rapidapi.com';

  /**
   * Fetch customer details from GST number
   */
  static async getCustomerDetailsFromGST(gstNumber: string): Promise<{ data: GSTCustomerDetails | null; error: string | null }> {
    try {
      // Validate GST number format (basic validation)
      if (!this.isValidGSTFormat(gstNumber)) {
        return {
          data: null,
          error: 'Invalid GST number format. Please enter a valid 15-character GST number.'
        };
      }

      console.log('🔍 Fetching GST details for:', gstNumber);

      const response = await fetch(`${this.BASE_URL}/getGSTDetailsUsingGST/${gstNumber}`, {
        method: 'GET',
        headers: {
          'x-rapidapi-host': this.RAPIDAPI_HOST,
          'x-rapidapi-key': this.RAPIDAPI_KEY,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ GST API Error:', response.status, errorText);
        return {
          data: null,
          error: `GST API Error: ${response.status} - ${response.statusText}`
        };
      }

      const result: GSTApiResponse = await response.json();
      console.log('✅ GST API Response:', result);

      if (!result.success || !result.data) {
        return {
          data: null,
          error: 'No GST details found for this number. Please verify the GST number or enter details manually.'
        };
      }

      // Handle both array and object response formats
      let gstData: GSTData;
      if (Array.isArray(result.data)) {
        if (result.data.length === 0) {
          return {
            data: null,
            error: 'No GST details found for this number. Please verify the GST number or enter details manually.'
          };
        }
        gstData = result.data[0];
      } else {
        gstData = result.data as GSTData;
      }

      const customerDetails = this.transformGSTDataToCustomerDetails(gstData, gstNumber);

      return {
        data: customerDetails,
        error: null
      };

    } catch (error) {
      console.error('❌ Error fetching GST details:', error);
      return {
        data: null,
        error: `Failed to fetch GST details: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }

  /**
   * Transform GST API data to customer details format
   */
  private static transformGSTDataToCustomerDetails(gstData: GSTData, gstNumber: string): GSTCustomerDetails {
    const principalAddress = gstData.principalAddress;
    const address = principalAddress?.address;

    // Build address string from available address fields
    const addressParts = [
      address?.buildingNumber,
      address?.buildingName,
      address?.street,
      address?.location,
      address?.locality
    ].filter(Boolean);

    const fullAddress = addressParts.length > 0
      ? addressParts.join(', ')
      : '';

    // Extract city, state, and pincode with fallbacks
    const city = address?.district || address?.location || address?.city || '';
    const state = address?.stateCode || '';
    const pincode = address?.pincode || '';

    return {
      name: gstData.legalName || gstData.tradeName || '',
      companyName: gstData.tradeName || gstData.legalName || '',
      address: fullAddress,
      city: city,
      state: state,
      pincode: pincode,
      gstNumber: gstNumber,
      businessType: gstData.constitutionOfBusiness || '',
      status: gstData.status || 'Active'
    };
  }

  /**
   * Basic GST number format validation
   */
  private static isValidGSTFormat(gstNumber: string): boolean {
    const cleanGST = gstNumber.replace(/\s/g, '').toUpperCase();

    // GST number should be 15 characters: 2(state) + 10(PAN) + 1(entity) + 1(Z) + 1(check digit)
    if (cleanGST.length !== 15) {
      return false;
    }

    // Basic pattern check: 2 letters + 10 alphanumeric + 1 letter + Z + 1 alphanumeric
    const gstPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/;
    return gstPattern.test(cleanGST);
  }

  /**
   * Format GST number for display
   */
  static formatGSTNumber(gstNumber: string): string {
    const cleanGST = gstNumber.replace(/\s/g, '').toUpperCase();
    if (cleanGST.length === 15) {
      return `${cleanGST.slice(0, 2)}${cleanGST.slice(2, 7)}${cleanGST.slice(7, 12)}${cleanGST.slice(12, 13)}${cleanGST.slice(13, 14)}${cleanGST.slice(14)}`;
    }
    return cleanGST;
  }
}
