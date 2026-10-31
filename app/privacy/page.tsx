import type { Metadata } from "next";
import InfoPage, { Contact } from "../../components/InfoPage";

export const metadata: Metadata = { title: "Privacy policy — Every Chef" };

export default function Privacy() {
  return (
    <InfoPage title="Privacy policy" updated="October 31, 2026">
      <p>Every Chef helps you find, save, plan and cook recipes. This page explains what information the app uses, why, and the choices you have. In short: we use your information to run the app, we don't sell it, and we don't show ads.</p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Your account.</strong> When you sign in, our sign-in provider (Clerk) gives us your name, email address and profile picture. If you sign in with Google or Apple, that's what they share with us.</li>
        <li><strong>Your recipes and plan.</strong> Recipes you save, scan, import or edit and your meal plan, so they're there on every device you sign in on. Ratings and a few preferences (like your store or text size) stay on your device.</li>
        <li><strong>Recipe photos and screenshots you scan.</strong> These are sent to our AI provider to read the recipe. Every Chef doesn't keep the images, only the recipe that comes out of them. A photo you add to a recipe yourself stays on your device.</li>
        <li><strong>Links you import.</strong> Our server opens the page to read the recipe from it.</li>
        <li><strong>Your location, only if you ask.</strong> If you tap to detect your location for in-season recipes, your device's location is sent to OpenStreetMap to look up your city. Only the city name is kept, on your device.</li>
        <li><strong>Basic technical information,</strong> like your IP address, used to keep the service running and to stop abuse (for example, limiting how many recipes can be made in a short time).</li>
      </ul>

      <h2>How recipes and photos are made</h2>
      <p>New recipes are written by Anthropic's Claude AI, and dish photos are made by Google's Gemini AI. We send them the recipe request and recipe details, not your name or email.</p>

      <h2>What other people can see</h2>
      <ul>
        <li><strong>The Community library.</strong> When you search for a dish that hasn't been made yet (without diet filters), the new recipe joins the shared Community library so others can open it too. It's not linked to your name or account.</li>
        <li><strong>Recipes you share.</strong> Anyone with the link can see that recipe, and edits you make show up on the link. Recipes you keep to yourself are private to your account.</li>
        <li><strong>Family collections.</strong> Recipes you add to a family collection can be seen by anyone with that collection's code.</li>
      </ul>

      <h2>Who helps us run Every Chef</h2>
      <p>We use a small number of service providers, only to run the app: Clerk (sign-in), Vercel (hosting and photo storage), Upstash (database), Anthropic (AI recipes), Google (AI dish photos) and OpenStreetMap (city lookup, only if you use it). We don't sell your information or share it for advertising, and we don't track you across other apps or websites.</p>

      <h2>Your choices</h2>
      <ul>
        <li><strong>Delete your account</strong> any time from your account menu in the app. This permanently removes your account, saved recipes, meal plan and the links you've shared. Recipes you added to a family collection stay with that collection, since others use it.</li>
        <li><strong>Report a recipe</strong> that's offensive or wrong from its menu, or from the shared page.</li>
        <li>Questions or requests: contact us at <Contact/>.</li>
      </ul>

      <h2>Children</h2>
      <p>Every Chef isn't meant for children under 13, and we don't knowingly collect information from them.</p>

      <h2>Changes</h2>
      <p>If we change this policy, we'll update this page and the date at the top.</p>
    </InfoPage>
  );
}
