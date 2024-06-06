import http from 'k6/http'
import { sleep, check } from 'k6'
import { SharedArray } from 'k6/data'
import { Trend, Counter } from 'k6/metrics'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3333'

const customers = new SharedArray('all my customers', function () {
	return JSON.parse(open('./customer.json')).customers
})

const pizzas = new Counter('quickpizza_number_of_pizzas')
const ingredients = new Trend('quickpizza_ingredients')

export function setup() {
	let res = http.get(BASE_URL)
	if (res.status !== 200) {
		throw new Error(
			`Got unexpected status code ${res.status} when trying to setup. Exiting.`
		)
	}
}

export let options = {
	stages: [
		{ duration: '5s', target: 20 },
		{ duration: '10s', target: 20 },
		{ duration: '5s', target: 0 }
	],
	thresholds: {
		http_req_duration: [{ threshold: 'p(95)<5000', abortOnFail: true }]
	}
}

export function teardown() {
	console.log('Teardown success for customers with IDs', customers)
}

export default function () {
	let restrictions = {
		maxCaloriesPerSlice: 500,
		mustBeVegetarian: false,
		excludedIngredients: [],
		excludedTools: ['knife'],
		maxNumberOfToppings: 6,
		minNumberOfToppings: 2
	}
	let res = http.post(`${BASE_URL}/api/pizza`, JSON.stringify(restrictions), {
		headers: {
			'Content-Type': 'application/json',
			'X-User-ID': customers[Math.floor(Math.random() * customers.length)]
		}
	})
	check(res, { 'status is not 500': (r) => r.status != 500 })
	sleep(1)
	pizzas.add(1)
	ingredients.add(res.json().pizza.ingredients.length)
	console.log(
		`${res.json().pizza.name} (${
			res.json().pizza.ingredients.length
		} ingredients)`
	)
}

export function handleSummary(data) {
	return {
		'summary.json': JSON.stringify(data)
	}
}
