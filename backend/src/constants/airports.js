/**
 * Comprehensive master catalog of active Indian commercial airport IATA codes
 * Used for semantic validation of domestic airfare routes.
 */
export const INDIAN_AIRPORTS = new Set([
  // Major Metros & Hubs (Tier 1)
  "DEL", // New Delhi (Indira Gandhi International)
  "BOM", // Mumbai (Chhatrapati Shivaji Maharaj International)
  "BLR", // Bengaluru (Kempegowda International)
  "HYD", // Hyderabad (Rajiv Gandhi International)
  "CCU", // Kolkata (Netaji Subhash Chandra Bose International)
  "MAA", // Chennai (Chennai International)
  "AMD", // Ahmedabad (Sardar Vallabhbhai Patel International)
  "PNQ", // Pune (Pune Airport)
  "GOI", // Goa (Dabolim Airport)
  "GOX", // Goa (Manohar International / Mopa)
  "COK", // Kochi (Cochin International)
  "TRV", // Thiruvananthapuram
  "CCJ", // Kozhikode (Calicut International)

  // Key Commercial & State Capitals (Tier 2)
  "PAT", // Patna (Jay Prakash Narayan)
  "GAU", // Guwahati (Lokpriya Gopinath Bordoloi)
  "JAI", // Jaipur (Jaipur International)
  "LKO", // Lucknow (Chaudhary Charan Singh International)
  "VNS", // Varanasi (Lal Bahadur Shastri)
  "IXC", // Chandigarh (Shaheed Bhagat Singh International)
  "BBI", // Bhubaneswar (Biju Patnaik International)
  "SXR", // Srinagar (Sheikh ul-Alam International)
  "IXB", // Bagdogra / Siliguri
  "IDR", // Indore (Devi Ahilyabai Holkar)
  "BHO", // Bhopal (Raja Bhoj)
  "NAG", // Nagpur (Dr. Babasaheb Ambedkar International)
  "RPR", // Raipur (Swami Vivekananda)
  "RNC", // Ranchi (Birsa Munda)
  "VGA", // Vijayawada
  "VTZ", // Visakhapatnam
  "CJB", // Coimbatore
  "IXM", // Madurai
  "TRZ", // Tiruchirappalli
  "IXE", // Mangalore
  "ATQ", // Amritsar (Sri Guru Ram Dass Jee International)
  "DED", // Dehradun (Jolly Grant)
  "UDR", // Udaipur (Maharana Pratap)
  "JDH", // Jodhpur
  "BDQ", // Vadodara
  "STV", // Surat
  "RAJ", // Rajkot
  "IXJ", // Jammu
  "IXL", // Leh (Kushok Bakula Rimpochee)

  // North-East & Regional Connectivity (UDAN / Emerging Hubs)
  "IMF", // Imphal (Bir Tikendrajit)
  "AJL", // Aizawl (Lengpui)
  "DMU", // Dimapur
  "SHL", // Shillong (Umroi)
  "IXA", // Agartala (Maharaja Bir Bikram)
  "DIB", // Dibrugarh
  "IXS", // Silchar
  "DHM", // Dharamshala / Kangra (Gaggal)
  "KUU", // Kullu / Manali (Bhuntar)
  "TIR", // Tirupati
  "HBX", // Hubli
  "IXG", // Belagavi
  "JLR", // Jabalpur
  "GWL", // Gwalior
  "AYJ", // Ayodhya (Maharishi Valmiki International)
  "HJR", // Khajuraho
  "PYG", // Prayagraj
  "IXZ", // Port Blair (Veer Savarkar International)
]);

/**
 * Checks if a given airport code is a recognized active Indian commercial airport.
 * @param {string} code - 3-letter IATA code
 * @returns {boolean}
 */
export const isValidIndianAirport = (code) => {
  if (typeof code !== "string") return false;
  return INDIAN_AIRPORTS.has(code.trim().toUpperCase());
};
