import { Client } from "@googlemaps/google-maps-services-js";

let placesClient: Client | null = null;

export function getGooglePlacesClient() {
  if (!placesClient) {
    placesClient = new Client({});
  }
  
  if (!process.env.GOOGLE_PLACES_API_KEY) {
    throw new Error('Google Places API key not configured');
  }

  return placesClient;
}