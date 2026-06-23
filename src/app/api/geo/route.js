import { NextResponse } from 'next/server';
import { getStatesForCountry, getAllCountriesWithDetails } from '../../lib/geo';

/**
 * GET /api/geo
 * 
 * Exposes the geodata APIs to the client:
 *   - ?action=countries: returns list of all canonical countries + codes + currencies
 *   - ?action=states&country=name: returns list of states/provinces/regions for a country
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    if (action === 'countries') {
      const countries = await getAllCountriesWithDetails();
      return NextResponse.json({ countries });
    }

    if (action === 'states') {
      const country = searchParams.get('country');
      if (!country) {
        return NextResponse.json({ error: 'Missing country parameter' }, { status: 400 });
      }
      const states = await getStatesForCountry(country);
      return NextResponse.json({ states });
    }

    return NextResponse.json({ error: 'Invalid action parameter' }, { status: 400 });
  } catch (err) {
    console.error('[/api/geo] Error:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
