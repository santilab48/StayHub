import {test} from 'node:test'
import {strict as assert} from 'node:assert'
import {adsenseClientId,validAdsenseSlot} from '../lib/ad-config'

test('AdSense slot accepts only Google numeric IDs',()=>{
  assert.equal(adsenseClientId,'ca-pub-6386708667648997')
  assert.equal(validAdsenseSlot('1234567890'),'1234567890')
  for(const value of ['',undefined,'abc1234567','12345678901','123456789\n','<script>'])assert.equal(validAdsenseSlot(value),null)
})
