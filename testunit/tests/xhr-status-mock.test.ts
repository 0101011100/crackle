/* oxlint-disable crackle/pascal-case */

import { test, expect } from 'vitest'

import { InstallXHRStatusMock } from '@userscript/xhr-status-mock.js'

class FakeXMLHttpRequest {
	static readonly HEADERS_RECEIVED = 2

	readyState = 0
	NativeStatus = 418

	open(_Method: string, _Url: string, _Async = true): void {
		this.readyState = 1
	}

	get status(): number {
		return this.NativeStatus
	}
}

InstallXHRStatusMock(FakeXMLHttpRequest as unknown as typeof XMLHttpRequest, [{
	Method: 'GET',
	Url: /^https:\/\/api\.example\.test\/content\//,
	Async: true,
	Status: 200,
	StatusText: 'OK'
}], '')

test('mocks matched XHR status after headers are received', () => {
	let Request = new FakeXMLHttpRequest()
	Request.open('get', 'https://api.example.test/content/42', true)

	expect(Request.status).toBe(418)

	Request.readyState = FakeXMLHttpRequest.HEADERS_RECEIVED
	expect(Request.status).toBe(200)
})

test('keeps native status when the method, URL, or async flag differs', () => {
	for (let RequestArguments of [
		['POST', 'https://api.example.test/content/42', true],
		['GET', 'https://api.example.test/other/42', true],
		['GET', 'https://api.example.test/content/42', false]
	] as const) {
		let Request = new FakeXMLHttpRequest()
		Request.open(RequestArguments[0], RequestArguments[1], RequestArguments[2])
		Request.readyState = FakeXMLHttpRequest.HEADERS_RECEIVED

		expect(Request.status).toBe(418)
	}
})

test('clears a prior mock when an XHR is reopened without a matching rule', () => {
	let Request = new FakeXMLHttpRequest()
	Request.open('GET', 'https://api.example.test/content/42', true)
	Request.readyState = FakeXMLHttpRequest.HEADERS_RECEIVED
	expect(Request.status).toBe(200)

	Request.open('POST', 'https://api.example.test/content/42', true)
	Request.readyState = FakeXMLHttpRequest.HEADERS_RECEIVED
	expect(Request.status).toBe(418)
})