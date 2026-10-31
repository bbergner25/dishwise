import type { Metadata } from "next";
import InfoPage, { Contact } from "../../components/InfoPage";

export const metadata: Metadata = { title: "Help & support — Every Chef" };

export default function Support() {
  return (
    <InfoPage title="Help & support">
      <h2>Bring in a recipe</h2>
      <p>On the Cook screen, use <strong>Photograph a recipe card</strong> for a card, a cookbook page or up to 4 screenshots, or <strong>Paste a link</strong> for a website or TikTok.</p>

      <h2>Share a recipe</h2>
      <p>Open the recipe, tap <strong>⋯</strong> then <strong>Share</strong>. Your link stays the same, and edits you make show up on it.</p>

      <h2>Report a recipe</h2>
      <p>Open a Community or shared recipe, tap <strong>⋯</strong> then <strong>Report this recipe</strong>. On a shared page, use <strong>Report this recipe</strong> at the bottom.</p>

      <h2>Delete your account</h2>
      <p>Tap your profile picture, then <strong>Delete account</strong>. This permanently removes your account, saved recipes, meal plan and shared links.</p>

      <h2>Still need help?</h2>
      <p>Contact us at <Contact/>.</p>

      <p style={{ marginTop: 24 }}><a href="/privacy">Privacy policy</a> · <a href="/terms">Terms of use</a> · <a href="/copyright">Copyright</a></p>
    </InfoPage>
  );
}
