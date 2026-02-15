// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract GrandmaGift {
    address public grandma;
    uint256 public giftAmount;
    
    struct Grandchild {
        uint256 birthday;
        bool hasWithdrawn;
        bool exists;
    }

    mapping(address => Grandchild) public grandchildren;
    address[] public grandchildList;

    event GiftWithdrawn(address indexed grandchild, uint256 amount);

    constructor(address[] memory _addresses, uint256[] memory _birthdays) payable {
        require(_addresses.length == _birthdays.length, "Mismatch between addresses and birthdays");
        require(msg.value > 0, "Grandma must send some ETH");

        grandma = msg.sender;
        giftAmount = msg.value / _addresses.length;

        for (uint256 i = 0; i < _addresses.length; i++) {
            grandchildren[_addresses[i]] = Grandchild(_birthdays[i], false, true);
            grandchildList.push(_addresses[i]);
        }
    }

    function withdraw() external {
        Grandchild storage child = grandchildren[msg.sender];
        
        require(child.exists, "You are not a grandchild!");
        require(block.timestamp >= child.birthday, "Wait for your birthday!");
        require(!child.hasWithdrawn, "You already took your gift!");

        child.hasWithdrawn = true;
        (bool success, ) = payable(msg.sender).call{value: giftAmount}("");
        require(success, "Transfer failed");

        emit GiftWithdrawn(msg.sender, giftAmount);
    }
}