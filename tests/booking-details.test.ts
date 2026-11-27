import test from 'node:test'
import assert from 'node:assert/strict'
import {parseBookingDetails} from '../lib/booking-details'
const valid={guestName:'Example Guest',phone:'',email:'',adults:2,children:0,checkInTime:'14:00',checkOutTime:'12:00',nightlyRate:799.95,source:'direct',notes:''}
test('booking total calculated in cents',()=>assert.equal(parseBookingDetails(valid,3)?.total,2399.85))
test('invalid fields rejected',()=>{for(const patch of [{guestName:' '},{adults:0},{children:-1},{checkInTime:'24:00'},{nightlyRate:1.001},{source:'bad'},{email:'invalid'}])assert.equal(parseBookingDetails({...valid,...patch},2),null)})
test('invalid nights rejected',()=>assert.equal(parseBookingDetails(valid,0),null))
