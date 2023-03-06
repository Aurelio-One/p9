/**
 * @jest-environment jsdom
 */

import { screen, waitFor, fireEvent } from '@testing-library/dom'
import userEvent from '@testing-library/user-event'
import NewBillUI from '../views/NewBillUI.js'
import NewBill from '../containers/NewBill.js'
import { localStorageMock } from '../__mocks__/localStorage.js'
import { ROUTES_PATH, ROUTES } from '../constants/routes.js'
import mockStore from '../__mocks__/store'
import router from '../app/Router.js'

// Mock the store
jest.mock('../app/store', () => mockStore)

describe('Given I am connected as an employee', () => {
  describe('When I am on NewBill Page', () => {
    test('Then mail icon in vertical layout should be highlighted', async () => {
      Object.defineProperty(window, 'localStorage', { value: localStorageMock })
      window.localStorage.setItem(
        'user',
        JSON.stringify({
          type: 'Employee',
        })
      )
      const root = document.createElement('div')
      root.setAttribute('id', 'root')
      document.body.append(root)
      router()

      window.onNavigate(ROUTES_PATH.NewBill)
      await waitFor(() => screen.getByTestId('icon-mail'))
      const mailIcon = screen.getByTestId('icon-mail')
      const iconActive = mailIcon.classList.contains('active-icon')
      expect(iconActive).toBeTruthy()
    })
  })

  // UNIT TEST: handleChangeFile
  describe('When I upload a file with an allowed format', () => {
    test('Then the file should be uploaded', async () => {
      // Set up test environement
      document.body.innerHTML = NewBillUI()
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      })

      const fileInput = screen.getByTestId('file')
      const fileUrl = 'fileUrl'
      const key = 'key'

      // Set up a file with allowed extension
      const file = new File(['hello'], 'hello.png', { type: 'image/png' })

      // Mock create function
      const mockCreate = jest.fn(() =>
        Promise.resolve({ fileUrl: 'fileUrl', key: 'key' })
      )
      newBill.store.bills().create = mockCreate

      // Triger change event
      fireEvent.change(fileInput, { target: { files: [file] } })

      // Wait for create function to be called
      await waitFor(() => expect(mockCreate).toHaveBeenCalled())

      // Check that the bill was created with the right data
      expect(newBill.billId).toBe(key)
      expect(newBill.fileUrl).toBe(fileUrl)
      expect(newBill.fileName).toBe('hello.png')
    })
    test('Then it should log an error message on catch', () => {
      // Set up test environment
      document.body.innerHTML = NewBillUI()
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      const newBill = new NewBill({
        document,
        onNavigate,
        store: mockStore,
        localStorage: window.localStorage,
      })

      // Spy on console.error
      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {})

      // Call the catch block with a mocked error
      const error = new Error('Testing error')
      newBill.store.bills().create.mockRejectedValueOnce(error)
      newBill.handleChangeFile({ preventDefault: jest.fn() })

      // Check that console.error has been called with the right argument
      expect(consoleErrorSpy).toHaveBeenCalled()
    })
  })

  describe('When I upload a file with the wrong format', () => {
    test('Then it should return an error message', async () => {
      // Set up test environement
      document.body.innerHTML = NewBillUI({})
      const onNavigate = (pathname) => {
        document.body.innerHTML = ROUTES({ pathname })
      }
      const newBill = new NewBill({
        document,
        onNavigate,
        mockStore,
        localStorage: window.localStorage,
      })

      // Set up a file with wrong extension
      const file = new File(['hello'], 'hello.txt', { type: 'document/txt' })

      // Get the input field
      const inputFile = screen.getByTestId('file')

      // Mock the handleChangeFile function
      const handleChangeFile = jest.fn((e) => newBill.handleChangeFile(e))

      // Spy on the alert function of the window object
      jest.spyOn(window, 'alert').mockImplementation(() => {})

      // Set up change event listener
      inputFile.addEventListener('change', handleChangeFile)

      // Simulate change
      fireEvent.change(inputFile, { target: { files: [file] } })

      // Check that handleChangeFile has been called
      expect(handleChangeFile).toHaveBeenCalled()

      // Check that the alert has been displayed with the right message
      expect(window.alert).toHaveBeenCalledWith(
        'Erreur : seuls les fichiers JPG, JPEG et PNG sont autorisés'
      )
    })
  })

  // UNIT TEST: handleSubmit
  describe('When I submit the form with empty fields', () => {
    test('Then I should stay on new Bill page', () => {
      // Set up test environment
      window.onNavigate(ROUTES_PATH.NewBill)
      const newBill = new NewBill({
        document,
        onNavigate,
        mockStore,
        localStorage: window.localStorage,
      })

      // Check that form fields are empty
      expect(screen.getByTestId('expense-name').value).toBe('')
      expect(screen.getByTestId('datepicker').value).toBe('')
      expect(screen.getByTestId('amount').value).toBe('')
      expect(screen.getByTestId('vat').value).toBe('')
      expect(screen.getByTestId('pct').value).toBe('')
      expect(screen.getByTestId('file').value).toBe('')

      // Get the submit button
      const form = screen.getByTestId('form-new-bill')

      // Mock the handleSubmot function
      const handleSubmit = jest.fn((e) => newBill.handleSubmit(e))

      // Set up submit event listener
      form.addEventListener('submit', handleSubmit)

      // Simulate form submission
      fireEvent.submit(form)

      // Check that the handleSubmit function has been called
      expect(handleSubmit).toHaveBeenCalled()

      // Check that the form is rendered
      expect(form).toBeTruthy()
    })
  })

  // INTEGRATION TESTING
  describe('When I do fill fields in correct format and I click on button Send', () => {
    beforeEach(() => {
      const root = document.createElement('div')
      root.setAttribute('id', 'root')
      document.body.appendChild(root)
      router()
    })
    describe('When there is no error on the API', () => {
      test('Then it should add the new bill to the list and I should be redirected to Bills page', async () => {
        // Set up test environment
        document.body.innerHTML = NewBillUI()
        Object.defineProperty(window, 'localStorage', {
          value: localStorageMock,
        })
        window.localStorage.setItem(
          'user',
          JSON.stringify({
            type: 'Employee',
            email: 'a@a',
          })
        )
        jest.spyOn(mockStore, 'bills')
        const onNavigate = jest.fn()
        const newBill = new NewBill({
          document,
          onNavigate,
          store: mockStore,
          localStorage: window.localStorage,
        })

        const inputExpenseType = screen.getByTestId('expense-type')
        const inputExpenseName = screen.getByTestId('expense-name')
        const inputDatePicker = screen.getByTestId('datepicker')
        const inputAmount = screen.getByTestId('amount')
        const inputVAT = screen.getByTestId('vat')
        const inputPCT = screen.getByTestId('pct')
        const inputFile = screen.getByTestId('file')
        const file = new File(['test'], 'test.png', { type: 'image/png' })

        // Trigger change and upload events
        fireEvent.change(inputExpenseType, { target: { value: 'Transports' } })
        fireEvent.change(inputExpenseName, { target: { value: 'Name' } })
        fireEvent.change(inputDatePicker, { target: { value: '2022-06-02' } })
        fireEvent.change(inputAmount, { target: { value: '364' } })
        fireEvent.change(inputVAT, { target: { value: '80' } })
        fireEvent.change(inputPCT, { target: { value: '20' } })
        userEvent.upload(inputFile, file)

        // Trigger form submission event
        const submitForm = screen.getByTestId('form-new-bill')
        const handleSubmit = jest.fn((e) => newBill.handleSubmit(e))
        submitForm.addEventListener('submit', handleSubmit)
        fireEvent.submit(submitForm)

        // Check that handleSubmit has been called
        expect(handleSubmit).toHaveBeenCalled()

        // check that a bill is created
        expect(jest.spyOn(mockStore, 'bills')).toHaveBeenCalled()
        expect(mockStore.bills).toHaveBeenCalled()

        // Check that I am redirected to the bills page
        expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['Bills'])
      })
    })
    describe('When an error occurs on API', () => {
      test('Then fails with 404 message error', async () => {
        mockStore.bills.mockImplementationOnce(() => {
          // Simulate a 404 error
          return {
            list: () => {
              return Promise.reject(new Error('Erreur 404'))
            },
          }
        })
        // Navigate to the Bills page
        window.onNavigate(ROUTES_PATH.Bills)

        // Check that the Error is displayed
        await new Promise(process.nextTick)
        const message = await screen.getByText(/Erreur 404/)
        expect(message).toBeTruthy()
      })
      test('Then fails with 500 message error', async () => {
        // Simulate a 500 error
        mockStore.bills.mockImplementationOnce(() => {
          return {
            list: () => {
              return Promise.reject(new Error('Erreur 500'))
            },
          }
        })
        // Navigate to the Bills page
        window.onNavigate(ROUTES_PATH.Bills)

        // Check that the Error is displayed
        await new Promise(process.nextTick)
        const message = await screen.getByText(/Erreur 500/)
        expect(message).toBeTruthy()
      })
    })
  })
})
