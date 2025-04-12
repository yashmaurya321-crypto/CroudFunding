// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CroudFunding {
    address public owner;
    uint256 public fundCount = 0;

    struct CroudFund {
        uint256 id;
        address creator;
        string title;
        string brief;
        uint256 requireAmount;
        uint256 currentAmount;
        bool completed;
        uint256 startTime;
        uint256 endTime;
        address[] contributors;
    }

    mapping(uint256 => CroudFund) public funds;

    constructor() {
        owner = msg.sender;
    }

    event FundCreated(uint256 indexed fundId, address indexed creator, string title, uint256 requireAmount, uint256 endTime);
    event FundContribution(address indexed contributor, uint256 indexed fundId, uint256 amount);
    event FundCompleted(uint256 indexed fundId);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this");
        _;
    }

    modifier fundExists(uint256 _fundId) {
        require(funds[_fundId].creator != address(0), "Fund does not exist");
        _;
    }

    function createCroudFund(
        string memory _title,
        string memory _brief,
        uint256 _requireAmount,
        uint256 _durationInMinutes
    ) public onlyOwner {
        fundCount++;
        CroudFund storage newFund = funds[fundCount];

        newFund.id = fundCount;
        newFund.creator = msg.sender;
        newFund.title = _title;
        newFund.brief = _brief;
        newFund.requireAmount = _requireAmount;
        newFund.currentAmount = 0;
        newFund.completed = false;
        newFund.startTime = block.timestamp;
        newFund.endTime = block.timestamp + (_durationInMinutes * 1 minutes);

        emit FundCreated(fundCount, msg.sender, _title, _requireAmount, newFund.endTime);
    }

    function contributeToFund(uint256 _fundId) public payable fundExists(_fundId) {
        CroudFund storage fund = funds[_fundId];

        require(block.timestamp <= fund.endTime, "Fundraising has ended");
        require(!fund.completed, "Fundraising already completed");
        require(msg.value > 0, "Contribution must be more than 0");

        fund.currentAmount += msg.value;
        fund.contributors.push(msg.sender);

        if (fund.currentAmount >= fund.requireAmount) {
            fund.completed = true;
            payable(fund.creator).transfer(fund.currentAmount);
            emit FundCompleted(_fundId);
        }

        emit FundContribution(msg.sender, _fundId, msg.value);
    }

    function getCroudFund(uint256 _fundId) public view fundExists(_fundId) returns (
        string memory title,
        string memory brief,
        uint256 requireAmount,
        uint256 currentAmount,
        bool completed,
        uint256 startTime,
        uint256 endTime,
        address[] memory contributors
    ) {
        CroudFund storage fund = funds[_fundId];
        return (
            fund.title,
            fund.brief,
            fund.requireAmount,
            fund.currentAmount,
            fund.completed,
            fund.startTime,
            fund.endTime,
            fund.contributors
        );
    }

    function getAllFunds() public view returns (CroudFund[] memory) {
        CroudFund[] memory allFunds = new CroudFund[](fundCount);
        for (uint256 i = 1; i <= fundCount; i++) {
            allFunds[i - 1] = funds[i];
        }
        return allFunds;
    }
}
