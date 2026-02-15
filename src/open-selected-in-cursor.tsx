import { showToast, Toast, open } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

const getSelectedFinderItems = async (): Promise<string[]> => {
  const script = `
    tell application "Finder"
      set selectedItems to selection
      if (count of selectedItems) is 0 then
        return ""
      end if
      set itemPaths to ""
      set firstItem to true
      repeat with itemRef in selectedItems
        set itemPath to POSIX path of (itemRef as alias)
        if firstItem then
          set itemPaths to itemPath
          set firstItem to false
        else
          set itemPaths to itemPaths & "\\n" & itemPath
        end if
      end repeat
      return itemPaths
    end tell
  `;

  try {
    const { stdout } = await execAsync(`osascript -e '${script}'`);
    const output = stdout.trim();
    
    if (!output || output.length === 0) {
      return [];
    }

    // Split by newline to get individual paths
    const paths = output
      .split("\n")
      .map((path) => path.trim())
      .filter((path) => path.length > 0);
    
    return paths;
  } catch (error) {
    console.error("Error getting Finder selection:", error);
    return [];
  }
};

export default async function Command() {
  try {
    const items = await getSelectedFinderItems();

    if (items.length === 0) {
      await showToast(Toast.Style.Failure, "No items selected", "Please select a file or folder in Finder");
      return;
    }

    // Open all selected items in Cursor
    for (const itemPath of items) {
      try {
        await open(itemPath, "Cursor");
      } catch (error) {
        console.error(`Error opening ${itemPath}:`, error);
      }
    }

    const itemType = items.length === 1 ? (items[0].endsWith("/") ? "folder" : "file") : "items";
    await showToast(
      Toast.Style.Success,
      `Opened ${items.length} ${itemType} in Cursor`,
      items.length === 1 ? items[0] : `${items.length} items opened`
    );
  } catch (error) {
    await showToast(
      Toast.Style.Failure,
      "Failed to get Finder selection",
      error instanceof Error ? error.message : String(error)
    );
  }
}
