import { FacetGroup } from '@/src/components/filters/FacetPanel';

// Benchmarked Aqar filters
export const AQAR_FACETS: FacetGroup[] = [
  { type:'radio', id:'txn', label:'Transaction', options:[
    {id:'rent', label:'For Rent'}, {id:'buy', label:'For Sale'}
  ]},
  { type:'check', id:'ptype', label:'Property Type', search:true, options:[
    {id:'apartment', label:'Apartment'}, {id:'villa', label:'Villa'},
    {id:'land', label:'Land'}, {id:'office', label:'Office'}, {id:'shop', label:'Shop'}
  ]},
  { type:'check', id:'city', label:'City', search:true, options:[] }, // fill from API
  { type:'check', id:'neighborhood', label:'Neighborhood', search:true, options:[] }, // API
  { type:'range', id:'price', label:'Price (SAR)', min:0, max:5_000_000, step:1000, unit:'SAR' },
  { type:'range', id:'area', label:'Area (m²)', min:0, max:2000, step:10, unit:'m²' },
  { type:'check', id:'rooms', label:'Rooms', options:[{id:'1',label:'1'},{id:'2',label:'2'},{id:'3',label:'3+'}]},
  { type:'check', id:'baths', label:'Bathrooms', options:[{id:'1',label:'1'},{id:'2',label:'2'},{id:'3',label:'3+'}]},
  { type:'check', id:'amenities', label:'Amenities', search:true, options:[
    {id:'parking',label:'Parking'},{id:'balcony',label:'Balcony'},{id:'furnished',label:'Furnished'}
  ]},
  { type:'radio', id:'posted', label:'Posting Date', options:[
    {id:'any',label:'Any'},{id:'7d',label:'Last 7 days'},{id:'30d',label:'Last 30 days'}
  ]}
];

// Amazon-style marketplace filters
export const MARKET_FACETS: FacetGroup[] = [
  { type:'check', id:'department', label:'Department', search:true, options:[] },
  { type:'range', id:'price', label:'Price', min:0, max:100000, step:1, unit:'SAR' },
  { type:'check', id:'brand', label:'Brand', search:true, options:[] },
  { type:'check', id:'rating', label:'Avg. Rating', options:[
    {id:'4up',label:'★★★★☆ & up'},{id:'3up',label:'★★★☆☆ & up'}
  ]},
  { type:'check', id:'delivery', label:'Delivery', options:[
    {id:'fast',label:'Fast delivery'},{id:'free',label:'Free shipping'}
  ]},
  { type:'check', id:'seller', label:'Seller', search:true, options:[] },
  { type:'check', id:'condition', label:'Condition', options:[
    {id:'new',label:'New'},{id:'used',label:'Used'},{id:'refurb',label:'Refurbished'}
  ]},
  { type:'check', id:'deals', label:'Deals', options:[{id:'onsale',label:'On sale'}]}
];
