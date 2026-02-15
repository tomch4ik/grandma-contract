const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("GrandmaGift", function () {
  let grandma, child1, child2, stranger;
  let grandmaGift;
  let totalDeposit = ethers.parseEther("10"); 
  let birthday1, birthday2;

  beforeEach(async function () {
    [grandma, child1, child2, stranger] = await ethers.getSigners();

    const now = await time.latest();
    birthday1 = now + time.duration.days(10); 
    birthday2 = now + time.duration.days(20); 

    const GrandmaGift = await ethers.getContractFactory("GrandmaGift");
    grandmaGift = await GrandmaGift.deploy(
      [child1.address, child2.address],
      [birthday1, birthday2],
      { value: totalDeposit }
    );
  });

  it("Бабуся може задеплоїти, внести кошти та задати онуків", async function () {
    expect(await grandmaGift.grandma()).to.equal(grandma.address);
    expect(await ethers.provider.getBalance(grandmaGift.target)).to.equal(totalDeposit);
    
    const childData = await grandmaGift.grandchildren(child1.address);
    expect(childData.exists).to.be.true;
    expect(childData.birthday).to.equal(birthday1);
  });

  it("Сума правильно ділиться між онуками", async function () {
    const expectedAmount = totalDeposit / 2n;
    expect(await grandmaGift.giftAmount()).to.equal(expectedAmount);
  });

  it("Транзакція відхиляється при спробі зняти до дня народження", async function () {
    await expect(grandmaGift.connect(child1).withdraw()).to.be.revertedWith(
      "Wait for your birthday!"
    );
  });

  it("Успішне зняття у день народження", async function () {
    await time.increaseTo(birthday1); 

    const balanceBefore = await ethers.provider.getBalance(child1.address);
    const tx = await grandmaGift.connect(child1).withdraw();
    const receipt = await tx.wait();
    
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    const balanceAfter = await ethers.provider.getBalance(child1.address);

    expect(balanceAfter).to.equal(balanceBefore + (totalDeposit / 2n) - gasUsed);
  });

  it("Успішне зняття після дня народження", async function () {
    await time.increaseTo(birthday1 + time.duration.days(5)); 
    await expect(grandmaGift.connect(child1).withdraw()).to.not.be.reverted;
  });

  it("Повторне зняття відхиляється", async function () {
    await time.increaseTo(birthday1);
    await grandmaGift.connect(child1).withdraw();
    
    await expect(grandmaGift.connect(child1).withdraw()).to.be.revertedWith(
      "You already took your gift!"
    );
  });

  it("Спроба стороннього виклику відхиляється", async function () {
    await expect(grandmaGift.connect(stranger).withdraw()).to.be.revertedWith(
      "You are not a grandchild!"
    );
  });

  it("При знятті генерується правильна подія", async function () {
    await time.increaseTo(birthday1);
    const giftAmount = await grandmaGift.giftAmount();

    await expect(grandmaGift.connect(child1).withdraw())
      .to.emit(grandmaGift, "GiftWithdrawn")
      .withArgs(child1.address, giftAmount);
  });
});