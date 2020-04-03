pragma solidity >=0.4.21 <0.6.0;

// Kyama Access Control contract
import "../Kyama Access Control/AccessControl.sol";
// Kyama base contract
import "../Kyama Base/Base.sol";
//Kyama M-Bill
import "../Kyama Treasury/MBill.sol";

// OpenZeppelin's SafeMath library
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/// @title Contract that handles an account's payment processes.
/// @dev Kyama-Project

contract MPayment is AccessControl {
    // Base contract reference
    Base public base;
    // MBill contract reference
    MBill public mBill;
    // MBill payable contract address
    address payable mBillPayableAddress;

    using SafeMath for uint256;

    // Event emited when an M-Bill debenture is partially/fully paid
    event Paid(address _accountHolder, uint256 _paidAmount);

    // Constructor to set initial values
    constructor(address _baseAddress, address _mBillAddress) public {
        // Initialize contracts
        base = Base(_baseAddress);
        mBillPayableAddress = address(uint160(_mBillAddress));
        mBill = MBill(mBillPayableAddress);
    }

    // Function to handle the payment of M-Bill debentures
    function payMDebenture() public payable requireIsOperational {
        require(base.isUserRegistered(msg.sender) == true, "Address provided for loan payment is not linked to a Kyama account.");
        require(msg.value > 0, "Loan payment amount provided is invalid.");
        require(base.outstandingMDebentures(msg.sender) > 0, "Account holder does not have any outstanding M-Bill loan balance.");

        // Get the payment value
        uint256 _paymentAmount = msg.value;
        uint256 paymentAmount = msg.value;

        // Get the immediate payable loan amount ... based on the earliest outstanding loan balance
        uint256 immediateDebentureBal = base.immediatePayableM(msg.sender);

        // Transfer funds to MBill contract
        mBillPayableAddress.transfer(msg.value);

        // Run a payment loop
        while(paymentAmount > 0 && immediateDebentureBal > 0) {

            // Get current debenture payment amount
            uint256 currentPayment = 0;
            // Debenture share capital
            uint256 debentureShareCap = 0;

            if(paymentAmount >= immediateDebentureBal) {
                currentPayment = immediateDebentureBal;
                paymentAmount = paymentAmount.sub(currentPayment);

                // Set debenture share capital
                debentureShareCap = base.immediateMShareCap(msg.sender);

                // Pay off debenture
                base.payImmediatePayableM(msg.sender, currentPayment);

                // Increment Kyama's total capital
                base.incrementTotalCapital(currentPayment);
                // Increment total M-Bills issued
                base.incrementTotalMIssued((currentPayment.mul(90)).div(100));
                // Increment total M-Bill share capital
                base.incrementMShareCap(debentureShareCap);

                // Mint M-Bills for the account owner
                mBill.mintM_Bill(msg.sender, debentureShareCap);
            } else {
                currentPayment = paymentAmount;
                paymentAmount = 0;

                // Increment Kyama's total capital
                base.incrementTotalCapital(currentPayment);
                // Increment total M-Bills issued
                base.incrementTotalMIssued((currentPayment.mul(90)).div(100));

                // Pay off debenture
                base.payImmediatePayableM(msg.sender, currentPayment);
            }

            // Update immediate payable loan amount
            immediateDebentureBal = base.immediatePayableM(msg.sender);

        }

        // If excess payment value, refund the account holder
        if(paymentAmount > 0) {
            address payable accPayable = address(uint160(msg.sender));
            mBill.issueEther(accPayable, paymentAmount);
        }

        // Emit the Paid event
        emit Paid(msg.sender, _paymentAmount);
    }
}