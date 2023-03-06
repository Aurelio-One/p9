/**
 * @jest-environment jsdom
 */

import { fireEvent, screen, waitFor } from '@testing-library/dom'
import { toHaveClass } from '@testing-library/jest-dom'

import router from '../app/Router.js'
import BillsUI from '../views/BillsUI.js'
import Bills from '../containers/Bills'
import mockedStore from '../__mocks__/store'
import { bills } from '../fixtures/bills.js'
import { ROUTES_PATH } from '../constants/routes.js'
import { localStorageMock } from '../__mocks__/localStorage.js'
import { formatDate, formatStatus } from '../app/format.js'

describe('Given I am connected as an employee', () => {
  describe('When I am on Bills Page', () => {
    test('Then bill icon in vertical layout should be highlighted', async () => {
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
      window.onNavigate(ROUTES_PATH.Bills)
      await waitFor(() => screen.getByTestId('icon-window'))
      const windowIcon = screen.getByTestId('icon-window')

      // Check that the window icon has the 'active-icon' class
      expect(windowIcon).toHaveClass('active-icon')
    })

    test('Then bills should be ordered from earliest to latest', () => {
      document.body.innerHTML = BillsUI({ data: bills })
      const dates = screen
        .getAllByText(
          /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
        )
        .map((a) => a.innerHTML)
      const antiChrono = (a, b) => (a > b ? -1 : 1)
      const datesSorted = [...dates].sort(antiChrono)

      expect(dates).toEqual(datesSorted)
    })
  })

  // UNIT TEST: handleClickNewBill
  describe('When I click on the new bill button', () => {
    test('Then I should be redirected to the new bill page', () => {
      // Set up test environment
      const onNavigate = jest.fn()
      const billsContainer = new Bills({ document, onNavigate })
      const handleClickNewBillMock = jest.fn(() => billsContainer.handleClickNewBill)
      const buttonNewBill = screen.getByTestId('btn-new-bill')

      // Set up click event listener
      buttonNewBill.addEventListener('click', handleClickNewBillMock())

      // Trigger the click event
      fireEvent.click(buttonNewBill)

      // Check that the method has been called
      expect(handleClickNewBillMock).toHaveBeenCalled()

      // Check that I am redirected to the right page
      expect(onNavigate).toHaveBeenCalledWith(ROUTES_PATH['NewBill'])
    })
  })

  // UNIT TEST: handleClickIconEye
  describe('When I click on an eye icon button', () => {
    test('Then a modal should open and display the right image', () => {
      // Set up test environment
      document.body.innerHTML = BillsUI({ data: bills })
      const iconEyes = screen.getAllByTestId('icon-eye')
      const billsContainer = new Bills({ document })

      // Mock the handleClickIconEye method
      const handleClickIconEyeMock = jest.fn(billsContainer.handleClickIconEye)

      // Mock the jQuery modal function
      $.fn.modal = jest.fn()

      // Check that every eye icon opens a modal containing the right image
      for (let i = 0; i < iconEyes.length; i++) {
        const eye = iconEyes[i]
        const billUrl = eye.getAttribute('data-bill-url')

        // Set up click event listener
        eye.addEventListener('click', handleClickIconEyeMock(eye))

        // Trigger the click event
        fireEvent.click(eye)

        // Check that the modal's title is displayed
        expect(screen.getByText('Justificatif')).toBeTruthy()

        // Check that the image displayed in the modal matches the eye icon data-src
        const modalImgSrc = document
          .querySelector('#modaleFile img')
          .getAttribute('src')
        expect(modalImgSrc).toEqual(billUrl)
      }
    })
  })
})

// UNIT TEST: getBills
describe('When the bills data is received', () => {
  test('Then bills should be displayed with right date and status format', async () => {
    // Set up test environment
    const billsContainer = new Bills({ document, store: mockedStore })
    const data = await billsContainer.getBills()
    const mockedBills = await mockedStore.bills().list()
    const mockedDate = mockedBills[0].date
    const mockedStatus = mockedBills[0].status

    // Check that date and status are formated
    expect(data[0].date).toEqual(formatDate(mockedDate))
    expect(data[0].status).toEqual(formatStatus(mockedStatus))
  })

  test('If the data is corrupted, then it should console.log(error) and return unformated data and formated status', async () => {
    // Set up test environment
    const corruptedData = {
      bills() {
        return {
          list() {
            return Promise.resolve([
              {
                date: 'corrupteddate',
                status: 'pending',
              },
            ])
          },
        }
      },
    }
    const billsContainer = new Bills({ document, store: corruptedData })
    const spyLog = jest.spyOn(console, 'log')
    const data = await billsContainer.getBills()

    // Check that there is a console log
    expect(spyLog).toHaveBeenCalled()

    // Check that date is not formated and status is
    expect(data[0].date).toEqual('corrupteddate')
    expect(data[0].status).toEqual(formatStatus('pending'))
  })
})
