-- SQL UPDATE statements to populate answers with Lorem Ipsum
-- Updates only the 'answer' field with TipTap JSON format
-- Format matches existing answer structure

UPDATE answers SET answer = '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."}]},{"type":"paragraph","content":[{"type":"text","text":"Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."}]}]}';
