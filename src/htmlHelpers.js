// HTML Manipulators

export const stripHTML =(html) => {
    var stripped_html;

    stripped_html = html.replace(/<[^>]*>/g, '');

    return stripped_html;
};