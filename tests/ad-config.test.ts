import {test} from 'node:test'
import assert from 'node:assert/strict'
import {providerHosts,validatedBannerUrl} from '../lib/ad-config'

test('banner URL accepts only HTTPS on the reviewed provider host',()=>{
  assert.equal(validatedBannerUrl('https://shameful-farm.com/reviewed-zone'),'https://shameful-farm.com/reviewed-zone')
  for(const value of [
    'http://shameful-farm.com/reviewed-zone',
    'https://shameful-farm.com.evil.example/reviewed-zone',
    'https://user:pass@shameful-farm.com/reviewed-zone',
    'https://shameful-farm.com:8443/reviewed-zone',
    'https://shameful-farm.com/reviewed-zone?account=123',
    'javascript:alert(1)',
    '',
  ])assert.equal(validatedBannerUrl(value),null,value)
})

test('an operator can allow multiple exact provider hosts',()=>{
  const hosts=providerHosts('shameful-farm.com,ads.reviewed.example')
  assert.deepEqual(hosts,['shameful-farm.com','ads.reviewed.example'])
  assert.equal(validatedBannerUrl('https://ads.reviewed.example/banner',hosts),'https://ads.reviewed.example/banner')
  assert.equal(validatedBannerUrl('https://other.reviewed.example/banner',hosts),null)
  assert.deepEqual(providerHosts('*.reviewed.example'),[])
  assert.deepEqual(providerHosts('localhost'),[])
})
