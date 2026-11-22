import test from 'node:test';
import assert from 'node:assert/strict';
import {evaluate,objects,listingUrl,roadDistance,searchQueries,coverageHealth} from './car-watch.mjs';
const car={name:'Hyundai i30 CW 1.4',offers:{price:3990,priceCurrency:'EUR',availability:'https://schema.org/InStock'},mileageFromOdometer:{value:158000,unitCode:'KMT'},bodyType:'Kombi',seatingCapacity:5,vehicleEngine:{enginePower:{value:80,unitCode:'KWT'},engineDisplacement:{value:1396}},fuelType:'Benzin',dateVehicleFirstRegistered:'2011-04-01',vehicleTransmission:'Schaltgetriebe',carbonDioxideEmissions:139,description:'HU 11/2028 Scheckheftgepflegt'};
const now=new Date('2026-11-19');
test('eligible chain variant and boundaries',()=>{assert.equal(evaluate(car,'https://example.com',now).ok,true);for(const patch of [{offers:{...car.offers,price:6501}},{mileageFromOdometer:{value:200001,unitCode:'KMT'}},{description:'HU 11/2028 Umweltplakette Grün Motorschaden'},{dateVehicleFirstRegistered:''},{offers:{...car.offers,availability:'SoldOut'}},{description:'HU 07/2026 Umweltplakette Grün'}])assert.equal(evaluate({...car,...patch},'',now).ok,false);});
test('no guessed chain or turbo petrol',()=>{assert.equal(evaluate({...car,name:'Ford Focus Turnier 1.6'},'',now).ok,false);assert.equal(evaluate({...car,name:'Hyundai i30 CW T-GDI',fuelType:'Benzin'},'',now).ok,false);});
test('original ad URLs only',()=>{assert.equal(listingUrl('https://www.kleinanzeigen.de/s-autos/burg'),null);assert.equal(listingUrl('https://evil.example/s-anzeige/car'),null);assert.ok(listingUrl('https://www.kleinanzeigen.de/s-anzeige/car/123-216-1'));});
test('JSON-LD does not turn result cards into vehicles',()=>{assert.equal(objects('<script type="application/ld+json">{"@type":"ItemList","itemListElement":[{"@type":"Car"}]}</script>').length,0);});
test('actual road distance, reject no route/address',async()=>{let calls=0;const address={streetAddress:'Street 1',postalCode:'12345',addressLocality:'Town'};const route=await roadDistance(address,async()=>++calls===1?[{lat:52,lon:12}]:{code:'Ok',routes:[{distance:161001}]});assert.equal(route.km,162);await assert.rejects(roadDistance({}));await assert.rejects(roadDistance(address,async()=>[]));});

test('new hard limits and excluded older diesel',()=>{for(const patch of [{dateVehicleFirstRegistered:'2009-04-01'},{description:'HU 11/2028 ohne Scheckheft'}])assert.equal(evaluate({...car,...patch},'',now).ok,false);});

test('200000km and automatic allowed, only whitelisted diesel',()=>{assert.equal(evaluate({...car,mileageFromOdometer:{value:199999,unitCode:'KMT'},vehicleTransmission:'Automatik'},'',now).ok,true);assert.equal(evaluate({...car,name:'Hyundai i30 CW 1.4',fuelType:'Diesel'},'',now).ok,false);const av={...car,name:'Toyota Avensis Kombi 2.2 D-4D',fuelType:'Diesel',vehicleEngine:{enginePower:{value:110,unitCode:'KWT'},engineDisplacement:{value:2231}},description:'HU 11/2028 Scheckheft Umweltplakette Grün'};assert.equal(evaluate(av,'',now).ok,true);});

test('every model query retains the region within Exa limit',()=>{
  for(const region of ['Burg Magdeburg Schönebeck','Brandenburg an der Havel Potsdam']){
    const queries=searchQueries(region);assert.equal(queries.length,8);
    for(const q of queries){assert.ok(q.startsWith(region));assert.ok(q.length<=250);}
  }
});
test('a green workflow must not conceal unreadable ads',()=>{
  assert.equal(coverageHealth({searched:5,discovered:55,read:1,outcomes:[]}).healthy,false);
  assert.equal(coverageHealth({searched:40,discovered:100,read:30,outcomes:[]}).healthy,false);
  assert.equal(coverageHealth({searched:40,discovered:100,read:30,outcomes:[{evaluated:true,reason:'price'}]}).healthy,true);
});
