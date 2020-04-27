pragma solidity >=0.4.21 <0.6.0;

// Kyama Access Control contract
import "../Kyama Access Control/AccessControl.sol";
// Kyama base contract
import "../Kyama Base/Base.sol";
//Kyama M-Bill
import "../Kyama Treasury/MBill.sol";

// OpenZeppelin's SafeMath library
import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

/// @title Contract that handles an account's lending functionality; transfer and debenture requests.
/// @dev Kyama-Project

contract MGenerous is AccessControl {
    // Base contract reference
    Base public base;
    // MBill contract reference
    MBill public mBill;

    using SafeMath for uint256;

    // Event emited when a transfer is made
    event Transfer(address _accountHolder, address _recipient, uint256 _transferAmount);
    // Event emited when an M-Bill debenture is approved
    event MDebenture(address _accountHolder, uint256 _debentureAmount);

    // Constructor to set initial values
    constructor(address _baseAddress, address _mBillAddress) public {
        // Initialize contracts
        base = Base(_baseAddress);
        address payable mBillPayableAddress = address(uint160(_mBillAddress));
        mBill = MBill(mBillPayableAddress);
    }

    // Funtion to transfer M-Bill tokens from one member account to another
    function transferMBill(address _recipientAddress, uint256 _transferAmount) external requireIsOperational {
        require(base.isUserRegistered(msg.sender) == true, "Address provided for M-Bill transfer is not linked to a Kyama account.");
        require(base.isUserRegistered(_recipientAddress) == true, "Recipient address provided for M-Bill transfer has no linked account.");
        require(_transferAmount > 0, "M-Bill transfer amount provided is invalid.");

        // Get share capital value of account holder
        uint256 accShareCapital = mBill.balanceOf(msg.sender);

        require(base.isAccountHarmonized(msg.sender, accShareCapital) == true, "Account is yet to meet investment consensus.");

        // Get total account value
        uint256 totalAccVal = base.getTotalMVal(accShareCapital);

        // Ensure that account holder is transfering M-Bills within account quota
        require(_transferAmount <= totalAccVal, "You do not have sufficient M-Bills to process this transfer.");

        // Get account M-Bill pPS
        uint256 acc_MPPS = totalAccVal.div(accShareCapital);
        // Get transfer share capital
        uint256 transferShareCap = _transferAmount.div(acc_MPPS);

        // Transfer X-Bills to recipient address account
        mBill.transferM_Bill(msg.sender, _recipientAddress, transferShareCap);

        // Record M-Bill transfer (sender)
        base.recordMData(msg.sender, uint256(0), _transferAmount, _recipientAddress, transferShareCap);
        // Record M-Bill transfer (recipient)
        base.recordMData(_recipientAddress, _transferAmount, uint256(0), msg.sender, transferShareCap);

        // Emit the Transfer event
        emit Transfer(msg.sender, _recipientAddress, _transferAmount);
    }

    // Function to request for M-Bill debenture
    function requestMDebenture(uint256 _debentureAmount) external requireIsOperational {
        require(base.isUserRegistered(msg.sender) == true, "Address provided for loan request is not linked to a Kyama account.");
        require(_debentureAmount > 0, "Loan request amount provided is invalid.");

        // Get share capital value of account holder
        uint256 accShareCapital = mBill.balanceOf(msg.sender);
        // Get account maximum debenture amount
        uint256 maxDebenture = base.getTotalDebenture(accShareCapital);

        require(base.isAccountHarmonized(msg.sender, accShareCapital) == true, "Account is yet to meet investment consensus.");

        // Ensure that intended debenture amount is within acceptable range
        require(_debentureAmount <= maxDebenture, "Loan amount provided is above account loan quota.");

        // Get account outstanding M-Bill debentures
        uint256 outstandingDebentures = base.outstandingMDebentures(msg.sender);

        // Ensure account has acceptable number of outstanding debentures
        require(outstandingDebentures < base.maxMDebentures(), "Account has too many outstanding loans at the moment.");

        // Get total account value
        uint256 totalAccVal = base.getTotalMVal(accShareCapital);
        // Get account M-Bill pPS
        uint256 acc_MPPS = totalAccVal.div(accShareCapital);

        // Ensure that debenture amount is above account pps
        require(_debentureAmount > acc_MPPS, "Loan amount provided is below account loan quota.");

        // Get debenture share capital
        uint256 debentureShareCap = _debentureAmount.div(acc_MPPS);

        // Burn account's tokens equivalent to the debenture amount
        mBill.burnM_Bill(msg.sender, debentureShareCap);

        // Decrement Kyama's total capital
        base.decrementTotalCapital(_debentureAmount);

        // Decrement total M-Bills issued
        base.decrementTotalMIssued(_debentureAmount);
        // Decrement total M-Bill share capital
        base.decrementMShareCap(debentureShareCap);

        // Record M-Bill debenture
        base.recordMDebenture(msg.sender, _debentureAmount, debentureShareCap);

        // Send corresponding ether amount to account holder
        address payable receiverPayableAddress = address(uint160(msg.sender));
        mBill.issueEther(receiverPayableAddress, _debentureAmount);

        // Emit the debenture approval event
        emit MDebenture(msg.sender, _debentureAmount);
    }
}