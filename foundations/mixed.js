import { browser } from 'k6/experimental/browser'
import { check, sleep } from 'k6'
import http from 'k6/http'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3333'

export const options = {
	scenarios: {
		smoke: {
			exec: 'getPizza',
			executor: 'constant-vus',
			vus: 1,
			duration: '10s'
		},
		stress: {
			exec: 'getPizza',
			executor: 'ramping-vus',
			stages: [
				{ duration: '5s', target: 5 },
				{ duration: '10s', target: 5 },
				{ duration: '5s', target: 0 }
			],
			gracefulRampDown: '5s',
			startTime: '10s'
		},
		browser: {
			exec: 'checkFrontend',
			executor: 'constant-vus',
			vus: 1,
			duration: '30s',
			options: {
				browser: {
					type: 'chromium'
				}
			}
		}
	}
}

export function getPizza() {
	let restrictions = {
		maxCaloriesPerSlice: 500,
		mustBeVegetarian: false,
		excludedIngredients: ['pepperoni'],
		excludedTools: ['knife'],
		maxNumberOfToppings: 6,
		minNumberOfToppings: 2
	}
	let res = http.post(`${BASE_URL}/api/pizza`, JSON.stringify(restrictions), {
		headers: {
			'Content-Type': 'application/json',
			'X-User-ID': 315316
		}
	})
	check(res, { 'status is 200': (res) => res.status === 200 })
	console.log(
		`${res.json().pizza.name} (${
			res.json().pizza.ingredients.length
		} ingredients)`
	)
	sleep(1)
}

export async function checkFrontend() {
	const page = browser.newPage()

	try {
		await page.goto(BASE_URL)
		check(page, {
			header:
				page.locator('h1').textContent() ==
				'Looking to break out of your pizza routine?'
		})

		await page.locator('//button[. = "Pizza, Please!"]').click()
		page.waitForTimeout(500)
		page.screenshot({ path: `screenshots/${__ITER}.png` })
		check(page, {
			recommendation: page.locator('div#recommendations').textContent() != ''
		})
	} finally {
		page.close()
	}
}
