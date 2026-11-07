import type { Metadata } from "next";
import InfoPage, { Contact } from "../../components/InfoPage";

export const metadata: Metadata = { title: "Terms of use — Every Chef" };

export default function Terms() {
  return (
    <InfoPage title="Terms of use" updated="November 6, 2026">
      <p>By using Every Chef you agree to these terms. If you don't agree, please don't use the app.</p>

      <h2>Cook with care</h2>
      <p>Many recipes, cook times and photos in Every Chef are made by AI and can contain mistakes. Always use your own judgment: check ingredients for allergies and dietary needs, cook meat, poultry, fish and eggs to safe temperatures, and follow food safety guidance. Every Chef isn't medical or nutritional advice.</p>

      <h2>Your account</h2>
      <p>You're responsible for activity on your account. You can delete it any time from the account menu.</p>

      <h2>Your recipes</h2>
      <p>Recipes and photos you add stay yours. When you share a recipe or join a household, you let us store and show it to the people who can open it. Recipes made from searches may join the shared Community library without your name. Only import or share recipes you have the right to use; imported recipes are for your personal use, and shared ones credit the original. To report a copyright concern, see our <a href="/copyright">copyright page</a>.</p>

      <h2>Fair use</h2>
      <p>Don't use Every Chef to post offensive, harmful or illegal content, to harass anyone, or to overload, copy or misuse the service or its AI. We may limit usage, remove content that breaks these rules, and suspend accounts that misuse the app.</p>

      <h2>Every Chef Plus</h2>
      <p>If we offer a paid plan, its price and what it includes will be shown before you subscribe, and purchases made through an app store follow that store's billing and refund terms.</p>

      <h2>No warranty</h2>
      <p>Every Chef is provided "as is". We work to keep it running and accurate but can't promise it will always be available or error-free. To the extent the law allows, we aren't liable for indirect or consequential damages from using the app.</p>

      <h2>Changes</h2>
      <p>We may update these terms. If the changes are significant, we'll let you know in the app. Continuing to use Every Chef means you accept the updated terms.</p>

      <h2>Contact</h2>
      <p>Questions about these terms: <Contact/>.</p>
    </InfoPage>
  );
}
