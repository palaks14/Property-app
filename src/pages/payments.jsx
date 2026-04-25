import axios from "axios";

function Payments() {

  const pay = async () => {
    const order = await axios.post("http://localhost:5000/create-order", {
      amount: 500
    });

    const options = {
      key: "YOUR_KEY_ID",
      amount: order.data.amount,
      currency: "INR",
      order_id: order.data.id,

      handler: async function (res) {
        await axios.post("http://localhost:5000/verify-payment", res);
        alert("Payment Successful 🎉");
      }
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Payments</h2>

      <button
        onClick={pay}
        className="bg-purple-600 text-white px-4 py-2 rounded-xl"
      >
        Pay Rent
      </button>
    </div>
  );
}

export default Payments;