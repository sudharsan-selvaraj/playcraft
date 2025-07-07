const TodoExample = `
async function refreshToDoList() {
  await page.evaluate(()=> {
    localStorage.clear();
  });
}

async function addTodo(todo) {
  await page.getByRole('textbox', { name: 'What needs to be done?' }).click();
  await page.getByRole('textbox', { name: 'What needs to be done?' }).fill(todo);
  await page.getByRole('textbox', { name: 'What needs to be done?' }).press('Enter');

  // wait for 1 second
  await new Promise(r => setTimeout(r, 1000));
}

/* Add Todo Test */
await page.goto('https://demo.playwright.dev/todomvc');
const TODO = [
  "Create Playwright Tests",
  "Fix login bug",
  "Submit expense report",
  "Buy milk"
];

for(const todo of TODO) {
  await addTodo(todo)
}

await refreshToDoList();
// this will fail
await expect(page.getByTestId("todo-title")).toHaveCount(5)
`;

const TabExample = `
await page.goto("https://the-internet.herokuapp.com/windows");

const [newPage] = await Promise.all([
  page.context().waitForEvent('page'),
  await page.getByRole('link', { name: 'Click Here' }).click()
])

console.info("URL:", newPage.url())
await newPage.close();
`

const FormExample = `
// Fill and submit a form
await page.goto('https://the-internet.herokuapp.com/login');

await page.getByLabel('Username').fill('tomsmith');
await page.getByLabel('Password').fill('SuperSecretPassword!');
await page.getByRole('button', { name: 'Login' }).click();

// Wait for successful login
await page.waitForSelector('.flash.success');
console.log('Login successful!');
`

const DropdownExample = `
// Handle dropdown selection
await page.goto('https://the-internet.herokuapp.com/dropdown');

await page.selectOption('#dropdown', 'Option 1');
console.log('Selected Option 1');

// Wait a moment and select another option
await page.waitForTimeout(1000);
await page.selectOption('#dropdown', 'Option 2');
console.log('Selected Option 2');
`

const HoverExample = `
// Hover interactions
await page.goto('https://the-internet.herokuapp.com/hovers');

// Hover over the first figure
await page.locator('.figure').first().hover();
await page.waitForSelector('.figcaption h5');

const caption = await page.locator('.figcaption h5').first().textContent();
console.log('Caption:', caption);
`

const WaitExample = `
// Various wait strategies
await page.goto('https://the-internet.herokuapp.com/dynamic_loading/1');

await page.getByRole('button', { name: 'Start' }).click();

// Wait for element to be visible
await page.waitForSelector('#finish', { state: 'visible' });

const result = await page.locator('#finish').textContent();
console.log('Result:', result);
`

const ScreenshotExample = `
// Take screenshots
await page.goto('https://playwright.dev');

// Full page screenshot
await page.screenshot({ path: 'full-page.png', fullPage: true });

// Element screenshot
await page.locator('.hero').screenshot({ path: 'hero-section.png' });

console.log('Screenshots taken successfully');

// Take screenshots
await page.goto('https://playwright.dev');

// Full page screenshot
await page.screenshot({ path: 'full-page.png', fullPage: true });

// Element screenshot
await page.locator('.hero').screenshot({ path: 'hero-section.png' });

console.log('Screenshots taken successfully');
`

const ApiMockExample = `
// Get the response and add to it
await page.route('*/**/api/v1/fruits', async (route) => {
    const response = await route.fetch();
    const json = await response.json();
    json.push({ name: 'Playwright', id: 100 });
    // Fulfill using the original response, while patching the response body
    // with the given JSON object.
    await route.fulfill({ response, json });
});

// Go to the page
await page.goto('https://demo.playwright.dev/api-mocking');

// Assert that the new fruit is visible
await expect(page.getByText('Playwright', { exact: true })).toBeVisible();
` 

export const examples = [
    {
        name: "Todo List Example",
        description: "Example to demonstrate adding todos to a list",
        code: TodoExample
    },
    {
        name: "Tab Example",
        description: "Example to demonstrate switching to a new tab",
        code: TabExample
    },
    {
        name: "Form Interaction",
        description: "Fill and submit a login form with validation",
        code: FormExample
    },
    {
        name: "Dropdown Selection",
        description: "Select options from a dropdown menu",
        code: DropdownExample
    },
    {
        name: "Hover Actions",
        description: "Perform hover interactions and capture results",
        code: HoverExample
    },
    {
        name: "Wait Strategies",
        description: "Different ways to wait for elements and content",
        code: WaitExample
    },
    {
        name: "Api Mocking",
        description: "Mocking API responses for testing",
        code: ApiMockExample
    },
    {
        name: "Screenshots",
        description: "Take full page and element screenshots",
        code: ScreenshotExample
    }
]
