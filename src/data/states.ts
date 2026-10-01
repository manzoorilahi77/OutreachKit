// Extracted verbatim from docs/source/territory-desk.html by scripts/extract-data.ts.
// Do not edit by hand: run `pnpm extract:data`, and `pnpm parity` will confirm it still matches.

import type { StateEntry } from "./types";

export type StateCode = "AL" | "AK" | "AZ" | "AR" | "CA" | "CO" | "CT" | "DE" | "DC" | "FL" | "GA" | "HI" | "ID" | "IL" | "IN" | "IA" | "KS" | "KY" | "LA" | "ME" | "MD" | "MA" | "MI" | "MN" | "MS" | "MO" | "MT" | "NE" | "NV" | "NH" | "NJ" | "NM" | "NY" | "NC" | "ND" | "OH" | "OK" | "OR" | "PA" | "RI" | "SC" | "SD" | "TN" | "TX" | "UT" | "VT" | "VA" | "WA" | "WV" | "WI" | "WY";
export const STATES: Record<StateCode, StateEntry> = {
  AL: [
    "Alabama",
    "Birmingham|Montgomery|Huntsville|Mobile|Tuscaloosa|Hoover|Auburn|Dothan|Decatur|Madison|Florence|Vestavia Hills|Prattville|Opelika|Gulf Shores|Trussville",
  ],
  AK: [
    "Alaska",
    "Anchorage|Fairbanks|Juneau|Wasilla|Palmer|Eagle River|Sitka|Ketchikan|Kenai|Kodiak|Soldotna|Homer",
  ],
  AZ: [
    "Arizona",
    "Phoenix|Tucson|Mesa|Chandler|Scottsdale|Gilbert|Glendale|Tempe|Peoria|Surprise|Goodyear|Buckeye|Flagstaff|Queen Creek|Prescott|Yuma|Sedona|Paradise Valley|Casa Grande|Oro Valley",
  ],
  AR: [
    "Arkansas",
    "Little Rock|Fayetteville|Fort Smith|Springdale|Jonesboro|Rogers|Conway|Bentonville|North Little Rock|Bella Vista|Hot Springs|Benton|Texarkana|Sherwood|Cabot",
  ],
  CA: [
    "California",
    "Los Angeles|San Diego|San Jose|San Francisco|Fresno|Sacramento|Long Beach|Oakland|Bakersfield|Anaheim|Santa Ana|Riverside|Irvine|Stockton|Chula Vista|Fremont|Santa Clarita|Modesto|Fontana|Moreno Valley|Huntington Beach|Glendale|Santa Rosa|Elk Grove|Roseville|Pasadena|Temecula|Palm Springs|Newport Beach|Walnut Creek|Thousand Oaks|Simi Valley|Murrieta|Corona|Folsom|Pleasanton|Danville|Carlsbad|Encinitas|Redondo Beach",
  ],
  CO: [
    "Colorado",
    "Denver|Colorado Springs|Aurora|Fort Collins|Lakewood|Thornton|Arvada|Westminster|Pueblo|Centennial|Boulder|Greeley|Longmont|Loveland|Broomfield|Castle Rock|Parker|Littleton|Highlands Ranch|Grand Junction|Erie|Golden|Durango|Steamboat Springs",
  ],
  CT: [
    "Connecticut",
    "Bridgeport|New Haven|Stamford|Hartford|Waterbury|Norwalk|Danbury|New Britain|West Hartford|Greenwich|Fairfield|Milford|Meriden|Bristol|Shelton|Middletown|Trumbull|Westport|Glastonbury|Farmington",
  ],
  DE: [
    "Delaware",
    "Wilmington|Dover|Newark|Middletown|Bear|Smyrna|Milford|Seaford|Georgetown|Lewes|Rehoboth Beach|Hockessin|Glasgow|Pike Creek",
  ],
  DC: [
    "District of Columbia",
    "Washington|Georgetown|Capitol Hill|Anacostia|Petworth|Brookland|Navy Yard",
  ],
  FL: [
    "Florida",
    "Jacksonville|Miami|Tampa|Orlando|St. Petersburg|Hialeah|Port St. Lucie|Cape Coral|Tallahassee|Fort Lauderdale|Pembroke Pines|Hollywood|Gainesville|Miramar|Coral Springs|Naples|Sarasota|Clearwater|Boca Raton|West Palm Beach|Fort Myers|Kissimmee|Ocala|Lakeland|Pensacola|Bradenton|Winter Garden|Jupiter|The Villages|Palm Beach Gardens|Melbourne|Daytona Beach|Destin|Wellington|Weston|Doral|Brandon|Riverview|Palm Coast|Estero",
  ],
  GA: [
    "Georgia",
    "Atlanta|Augusta|Columbus|Macon|Savannah|Athens|Sandy Springs|Roswell|Johns Creek|Albany|Warner Robins|Alpharetta|Marietta|Valdosta|Smyrna|Dunwoody|Peachtree City|Kennesaw|Gainesville|Milton|Woodstock|Cumming|Newnan|Suwanee|Duluth|Decatur|Buford",
  ],
  HI: [
    "Hawaii",
    "Honolulu|Pearl City|Hilo|Kailua|Waipahu|Kaneohe|Mililani Town|Kahului|Ewa Beach|Kihei|Kapolei|Wailuku|Lahaina|Kailua-Kona",
  ],
  ID: [
    "Idaho",
    "Boise|Meridian|Nampa|Idaho Falls|Caldwell|Pocatello|Coeur d'Alene|Twin Falls|Post Falls|Rexburg|Eagle|Kuna|Moscow|Hayden|Star|Ammon|Sandpoint|Ketchum",
  ],
  IL: [
    "Illinois",
    "Chicago|Aurora|Joliet|Naperville|Rockford|Springfield|Elgin|Peoria|Champaign|Waukegan|Cicero|Bloomington|Arlington Heights|Schaumburg|Evanston|Bolingbrook|Palatine|Skokie|Des Plaines|Orland Park|Oak Park|Wheaton|Berwyn|Tinley Park|Hoffman Estates|Downers Grove|Lake Forest|Hinsdale",
  ],
  IN: [
    "Indiana",
    "Indianapolis|Fort Wayne|Evansville|South Bend|Carmel|Fishers|Bloomington|Hammond|Gary|Lafayette|Noblesville|Greenwood|Kokomo|Muncie|Terre Haute|Westfield|Elkhart|Columbus|Zionsville|Valparaiso|Crown Point|Avon|Brownsburg",
  ],
  IA: [
    "Iowa",
    "Des Moines|Cedar Rapids|Davenport|Sioux City|Iowa City|Waterloo|Ames|West Des Moines|Ankeny|Council Bluffs|Dubuque|Urbandale|Cedar Falls|Bettendorf|Marion|Clive|Johnston|Waukee",
  ],
  KS: [
    "Kansas",
    "Wichita|Overland Park|Kansas City|Olathe|Topeka|Lawrence|Shawnee|Manhattan|Lenexa|Salina|Hutchinson|Leawood|Derby|Prairie Village|Garden City|Gardner|Emporia",
  ],
  KY: [
    "Kentucky",
    "Louisville|Lexington|Bowling Green|Owensboro|Covington|Georgetown|Richmond|Florence|Hopkinsville|Nicholasville|Elizabethtown|Independence|Jeffersontown|Paducah|Frankfort|Prospect|Union|Somerset",
  ],
  LA: [
    "Louisiana",
    "New Orleans|Baton Rouge|Shreveport|Lafayette|Lake Charles|Kenner|Bossier City|Monroe|Alexandria|Houma|Metairie|Slidell|Mandeville|Covington|New Iberia|Ruston|Zachary|Prairieville",
  ],
  ME: [
    "Maine",
    "Portland|Lewiston|Bangor|South Portland|Auburn|Biddeford|Sanford|Saco|Augusta|Westbrook|Brunswick|Scarborough|Falmouth|Kennebunk|Cape Elizabeth|Camden|Bar Harbor",
  ],
  MD: [
    "Maryland",
    "Baltimore|Columbia|Germantown|Silver Spring|Waldorf|Frederick|Ellicott City|Glen Burnie|Rockville|Gaithersburg|Bethesda|Annapolis|Bowie|Towson|Severn|Potomac|Hagerstown|Salisbury|Olney|Clarksville|Chevy Chase|Easton|Ocean City",
  ],
  MA: [
    "Massachusetts",
    "Boston|Worcester|Springfield|Cambridge|Lowell|Brockton|Quincy|Lynn|New Bedford|Fall River|Newton|Somerville|Framingham|Haverhill|Waltham|Malden|Brookline|Plymouth|Medford|Weymouth|Andover|Needham|Wellesley|Lexington|Concord|Barnstable|Nantucket|Beverly|Marblehead",
  ],
  MI: [
    "Michigan",
    "Detroit|Grand Rapids|Warren|Sterling Heights|Ann Arbor|Lansing|Flint|Dearborn|Livonia|Troy|Westland|Farmington Hills|Kalamazoo|Rochester Hills|Novi|Royal Oak|Canton|Clinton Township|Traverse City|Birmingham|Grosse Pointe|Northville|Saline|Holland|Midland|Petoskey",
  ],
  MN: [
    "Minnesota",
    "Minneapolis|St. Paul|Rochester|Duluth|Bloomington|Brooklyn Park|Plymouth|Woodbury|Maple Grove|Eagan|Eden Prairie|Blaine|Coon Rapids|Burnsville|Lakeville|Minnetonka|Edina|St. Cloud|Apple Valley|Wayzata|Chanhassen|Shakopee|Mankato|Stillwater",
  ],
  MS: [
    "Mississippi",
    "Jackson|Gulfport|Southaven|Biloxi|Hattiesburg|Olive Branch|Tupelo|Meridian|Greenville|Horn Lake|Madison|Starkville|Oxford|Brandon|Ridgeland|Ocean Springs|Clinton",
  ],
  MO: [
    "Missouri",
    "Kansas City|St. Louis|Springfield|Columbia|Independence|Lee's Summit|O'Fallon|St. Joseph|St. Charles|St. Peters|Blue Springs|Florissant|Joplin|Chesterfield|Jefferson City|Cape Girardeau|Wildwood|Branson|Ballwin|Liberty|Kirkwood|Nixa",
  ],
  MT: [
    "Montana",
    "Billings|Missoula|Great Falls|Bozeman|Butte|Helena|Kalispell|Havre|Whitefish|Belgrade|Livingston|Anaconda|Columbia Falls|Big Sky",
  ],
  NE: [
    "Nebraska",
    "Omaha|Lincoln|Bellevue|Grand Island|Kearney|Fremont|Hastings|Norfolk|Papillion|Columbus|La Vista|Elkhorn|Scottsbluff|Gretna|Seward",
  ],
  NV: [
    "Nevada",
    "Las Vegas|Henderson|Reno|North Las Vegas|Sparks|Carson City|Summerlin|Enterprise|Spring Valley|Paradise|Elko|Mesquite|Boulder City|Pahrump|Incline Village",
  ],
  NH: [
    "New Hampshire",
    "Manchester|Nashua|Concord|Derry|Dover|Rochester|Salem|Merrimack|Londonderry|Hudson|Keene|Portsmouth|Bedford|Exeter|Hampton|Amherst|North Conway",
  ],
  NJ: [
    "New Jersey",
    "Newark|Jersey City|Paterson|Elizabeth|Edison|Woodbridge|Lakewood|Toms River|Hamilton|Trenton|Clifton|Camden|Brick|Cherry Hill|Passaic|Union City|Bayonne|Princeton|Montclair|Morristown|Hoboken|Freehold|Marlton|Summit|Ridgewood|Red Bank|Cape May",
  ],
  NM: [
    "New Mexico",
    "Albuquerque|Las Cruces|Rio Rancho|Santa Fe|Roswell|Farmington|Clovis|Hobbs|Alamogordo|Carlsbad|Gallup|Los Lunas|Los Alamos|Taos|Ruidoso",
  ],
  NY: [
    "New York",
    "New York City|Brooklyn|Queens|Bronx|Staten Island|Buffalo|Rochester|Yonkers|Syracuse|Albany|New Rochelle|Mount Vernon|Schenectady|Utica|White Plains|Hempstead|Troy|Niagara Falls|Binghamton|Long Beach|Ithaca|Poughkeepsie|Huntington|Scarsdale|Saratoga Springs|Kingston|Nyack|Great Neck|Southampton",
  ],
  NC: [
    "North Carolina",
    "Charlotte|Raleigh|Greensboro|Durham|Winston-Salem|Fayetteville|Cary|Wilmington|High Point|Concord|Asheville|Greenville|Gastonia|Apex|Huntersville|Chapel Hill|Wake Forest|Mooresville|Holly Springs|Matthews|Kannapolis|Hickory|Cornelius|Davidson|Waxhaw|Fuquay-Varina|Boone|Southern Pines",
  ],
  ND: [
    "North Dakota",
    "Fargo|Bismarck|Grand Forks|Minot|West Fargo|Williston|Dickinson|Mandan|Jamestown|Wahpeton|Devils Lake",
  ],
  OH: [
    "Ohio",
    "Columbus|Cleveland|Cincinnati|Toledo|Akron|Dayton|Parma|Canton|Youngstown|Lorain|Hamilton|Springfield|Kettering|Elyria|Dublin|Westerville|Beavercreek|Mason|Strongsville|Hilliard|Delaware|Powell|Upper Arlington|Medina|Wooster|Findlay|Athens",
  ],
  OK: [
    "Oklahoma",
    "Oklahoma City|Tulsa|Norman|Broken Arrow|Edmond|Lawton|Moore|Midwest City|Enid|Stillwater|Owasso|Bartlesville|Jenks|Bixby|Yukon|Ardmore|Muskogee",
  ],
  OR: [
    "Oregon",
    "Portland|Salem|Eugene|Gresham|Hillsboro|Beaverton|Bend|Medford|Springfield|Corvallis|Albany|Tigard|Lake Oswego|Keizer|Grants Pass|McMinnville|West Linn|Ashland|Newberg|Redmond",
  ],
  PA: [
    "Pennsylvania",
    "Philadelphia|Pittsburgh|Allentown|Erie|Reading|Scranton|Bethlehem|Lancaster|Harrisburg|York|Altoona|State College|Wilkes-Barre|Chester|Norristown|Bensalem|Doylestown|West Chester|King of Prussia|Media|Newtown|Wayne|Sewickley|Cranberry Township|Bethel Park|Stroudsburg",
  ],
  RI: [
    "Rhode Island",
    "Providence|Warwick|Cranston|Pawtucket|East Providence|Woonsocket|Coventry|Cumberland|North Providence|South Kingstown|Newport|Barrington|Narragansett|Westerly|Bristol",
  ],
  SC: [
    "South Carolina",
    "Charleston|Columbia|North Charleston|Mount Pleasant|Rock Hill|Greenville|Summerville|Sumter|Goose Creek|Hilton Head Island|Florence|Spartanburg|Myrtle Beach|Aiken|Greer|Bluffton|Fort Mill|Simpsonville|Beaufort|Clemson",
  ],
  SD: [
    "South Dakota",
    "Sioux Falls|Rapid City|Aberdeen|Brookings|Watertown|Mitchell|Yankton|Pierre|Huron|Spearfish|Brandon|Sturgis",
  ],
  TN: [
    "Tennessee",
    "Nashville|Memphis|Knoxville|Chattanooga|Clarksville|Murfreesboro|Franklin|Jackson|Johnson City|Bartlett|Hendersonville|Kingsport|Collierville|Smyrna|Brentwood|Cleveland|Germantown|Spring Hill|Mount Juliet|Gallatin|Maryville|Sevierville|Cookeville",
  ],
  TX: [
    "Texas",
    "Houston|San Antonio|Dallas|Austin|Fort Worth|El Paso|Arlington|Corpus Christi|Plano|Laredo|Lubbock|Garland|Irving|Frisco|McKinney|Amarillo|Grand Prairie|Brownsville|Killeen|Pasadena|McAllen|Denton|Waco|Midland|Round Rock|Sugar Land|The Woodlands|Allen|League City|Richardson|Pearland|College Station|Tyler|Odessa|Southlake|Prosper|Celina|Mansfield|Rockwall|Flower Mound|Katy|Conroe|New Braunfels|San Marcos|Georgetown|Cedar Park|Leander|Wylie|Little Elm|Colleyville|Aledo|Midlothian|Boerne|Fredericksburg",
  ],
  UT: [
    "Utah",
    "Salt Lake City|West Valley City|Provo|West Jordan|Orem|Sandy|St. George|Ogden|Layton|South Jordan|Lehi|Millcreek|Taylorsville|Logan|Murray|Draper|Herriman|Eagle Mountain|Bountiful|Park City|Saratoga Springs|American Fork|Kaysville|Heber City",
  ],
  VT: [
    "Vermont",
    "Burlington|South Burlington|Rutland|Essex Junction|Barre|Montpelier|Winooski|St. Albans|Newport|Middlebury|Stowe|Brattleboro|Bennington|Manchester",
  ],
  VA: [
    "Virginia",
    "Virginia Beach|Chesapeake|Norfolk|Richmond|Newport News|Alexandria|Hampton|Roanoke|Portsmouth|Suffolk|Lynchburg|Harrisonburg|Charlottesville|Danville|Manassas|Fredericksburg|Winchester|Blacksburg|Leesburg|Ashburn|Reston|Arlington|McLean|Vienna|Centreville|Chantilly|Herndon|Woodbridge|Stafford|Midlothian|Glen Allen|Williamsburg",
  ],
  WA: [
    "Washington",
    "Seattle|Spokane|Tacoma|Vancouver|Bellevue|Kent|Everett|Renton|Federal Way|Spokane Valley|Yakima|Kirkland|Bellingham|Kennewick|Auburn|Marysville|Redmond|Sammamish|Pasco|Richland|Olympia|Lakewood|Puyallup|Issaquah|Bothell|Wenatchee|Gig Harbor|Mercer Island|Woodinville|Leavenworth",
  ],
  WV: [
    "West Virginia",
    "Charleston|Huntington|Morgantown|Parkersburg|Wheeling|Weirton|Martinsburg|Fairmont|Beckley|Clarksburg|Teays Valley|Hurricane|Bridgeport|Lewisburg",
  ],
  WI: [
    "Wisconsin",
    "Milwaukee|Madison|Green Bay|Kenosha|Racine|Appleton|Waukesha|Eau Claire|Oshkosh|Janesville|West Allis|La Crosse|Sheboygan|Wauwatosa|Fond du Lac|Brookfield|New Berlin|Menomonee Falls|Mequon|Middleton|Sun Prairie|Door County",
  ],
  WY: [
    "Wyoming",
    "Cheyenne|Casper|Laramie|Gillette|Rock Springs|Sheridan|Green River|Evanston|Riverton|Jackson|Cody|Rawlins|Buffalo",
  ],
};
