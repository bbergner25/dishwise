import type { Metadata } from "next";
import InfoPage, { Contact } from "../../components/InfoPage";

export const metadata: Metadata = { title: "Copyright — Every Chef" };

export default function Copyright() {
  return (
    <InfoPage title="Copyright and takedown requests" updated="October 31, 2026">
      <p>We respect the work of recipe writers, photographers and publishers. People can import recipes into their own private library and share recipes by link, and shared imported recipes always credit and link to the original. If you believe something on Every Chef uses your work without permission, tell us and we'll look into it promptly.</p>

      <h2>How to ask us to remove something</h2>
      <p>Send a notice to our copyright agent at <Contact/> with:</p>
      <ul>
        <li>The work you believe is being copied (for example, a link to your original recipe).</li>
        <li>The Every Chef link where it appears.</li>
        <li>Your name, address, phone number and email.</li>
        <li>A statement that you believe in good faith the use isn't authorized by you, your agent or the law.</li>
        <li>A statement, under penalty of perjury, that the information in your notice is accurate and that you're the owner or authorized to act for the owner.</li>
        <li>Your physical or electronic signature (typing your full name works).</li>
      </ul>
      <p>When we receive a complete notice, we'll remove or disable the material and let the person who shared it know.</p>
      <p>You can also use <strong>Report this recipe</strong> at the bottom of any shared recipe page, choosing "Copied without permission". A formal notice like the one above is still the fastest way to have something removed.</p>

      <h2>If your recipe was removed by mistake</h2>
      <p>If you shared something that was removed and believe it was a mistake or that you had the right to use it, you can send a counter-notice to the same address with: the removed material and where it appeared; a statement, under penalty of perjury, that you believe it was removed by mistake or misidentification; your name, address and phone number; your consent to the jurisdiction of the federal court for your address (or, outside the US, any court where Every Chef may be found) and to accept service from the person who filed the notice; and your signature. We may restore the material unless the original complainant tells us they've filed a court action.</p>

      <h2>Repeat infringement</h2>
      <p>We may remove content and close the accounts of people who repeatedly share material that infringes others' rights.</p>
    </InfoPage>
  );
}
