exports.config =
  files:
    javascripts:
      joinTo:
        'javascripts/app.js': /^app/
        'javascripts/vendor.js': /^(?!app)/
    stylesheets:
      joinTo: 'stylesheets/app.css'
      order:
        before: [/bower_components/]
    templates:
      joinTo: 'javascripts/app.js'
